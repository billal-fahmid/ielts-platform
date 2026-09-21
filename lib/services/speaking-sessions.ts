import { db } from "@/lib/db";
import { profiles, speakingSlots, users } from "@/lib/db/schema";
import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { cleanText } from "@/lib/security/http";
import { notify } from "@/lib/services/notifications";
import { TeachingError } from "@/lib/services/teaching";
import { isWebLink } from "@/lib/teaching/rules";
import {
  ACTIVE_SLOT_STATUSES,
  BAND_PROBLEM,
  BOOKING_LEAD_MINUTES,
  canBook,
  canMarkNoShow,
  canStart,
  canStudentCancel,
  dhakaLocalToUtcIso,
  formatSlotTime,
  isValidBand,
  MAX_ACTIVE_BOOKINGS,
  MAX_FEEDBACK_CHARS,
  MAX_FUTURE_SLOTS,
  SLOT_DURATIONS,
  SLOT_MIN_LEAD_MINUTES,
  slotsOverlap,
} from "@/lib/reviews/rules";

export type Slot = typeof speakingSlots.$inferSelect;

const getSlot = (id: string) => db.select().from(speakingSlots).where(eq(speakingSlots.id, id)).get();
const nameOf = (userId: string | null) => (userId ? (db.select({ name: users.name }).from(users).where(eq(users.id, userId)).get()?.name ?? "Someone") : null);
const active = (s: Slot) => (ACTIVE_SLOT_STATUSES as string[]).includes(s.status);

// ---------- Teacher: publishing slots ----------

export type SlotInput = { startsAtLocal: string; durationMinutes: number; meetingUrl: string };

/** Publishes a bookable time. The time is typed in Bangladesh time. */
export function createSlot(teacherId: string, input: SlotInput, now = new Date()): Slot {
  const startsAt = dhakaLocalToUtcIso(input.startsAtLocal);
  if (!startsAt) throw new TeachingError("Choose a valid date and time.");
  if (!(SLOT_DURATIONS as readonly number[]).includes(input.durationMinutes)) throw new TeachingError(`The session length must be ${SLOT_DURATIONS.join(", ")} minutes.`);
  const meetingUrl = (input.meetingUrl ?? "").trim();
  if (!meetingUrl || !isWebLink(meetingUrl)) throw new TeachingError("Add the meeting link (Zoom, Google Meet...) starting with https://");
  if (new Date(startsAt).getTime() - now.getTime() < SLOT_MIN_LEAD_MINUTES * 60_000) throw new TeachingError(`Choose a time at least ${SLOT_MIN_LEAD_MINUTES} minutes from now.`);

  const mine = db.select().from(speakingSlots).where(eq(speakingSlots.teacherId, teacherId)).all().filter(active);
  const candidate = { startsAt, durationMinutes: input.durationMinutes };
  const clash = mine.find((s) => slotsOverlap(s, candidate));
  if (clash) throw new TeachingError(`That overlaps another session (${formatSlotTime(clash.startsAt)}).`);
  if (mine.filter((s) => new Date(s.startsAt).getTime() > now.getTime()).length >= MAX_FUTURE_SLOTS) throw new TeachingError(`You can have at most ${MAX_FUTURE_SLOTS} upcoming slots.`);

  const id = newId();
  db.insert(speakingSlots).values({ id, teacherId, startsAt, durationMinutes: input.durationMinutes, meetingUrl }).run();
  return getSlot(id)!;
}

export function listTeacherSlots(teacherId: string) {
  return db
    .select()
    .from(speakingSlots)
    .where(eq(speakingSlots.teacherId, teacherId))
    .orderBy(asc(speakingSlots.startsAt))
    .all()
    .filter((s) => s.status !== "CANCELLED")
    .map((s) => ({ ...s, studentName: nameOf(s.studentId) }));
}

export function upcomingSessionCount(teacherId: string, now = new Date()) {
  return db
    .select()
    .from(speakingSlots)
    .where(and(eq(speakingSlots.teacherId, teacherId), inArray(speakingSlots.status, ["BOOKED", "IN_PROGRESS"])))
    .all()
    .filter((s) => new Date(s.startsAt).getTime() + s.durationMinutes * 60_000 > now.getTime()).length;
}

/**
 * Removes a slot. An open slot just disappears; a booked one is cancelled and the student is told.
 * Started or finished sessions can't be cancelled.
 */
export function cancelSlot(teacherId: string, slotId: string, reason?: string | null) {
  const s = getSlot(slotId);
  if (!s || s.teacherId !== teacherId) throw new TeachingError("That session doesn't exist.", 404);
  if (s.status === "OPEN") {
    db.delete(speakingSlots).where(and(eq(speakingSlots.id, slotId), eq(speakingSlots.status, "OPEN"))).run();
    return;
  }
  if (s.status !== "BOOKED") throw new TeachingError("Only open or booked sessions can be cancelled.");
  const why = reason ? cleanText(reason).slice(0, 500) || null : null;
  db.update(speakingSlots).set({ status: "CANCELLED", cancelReason: why }).where(eq(speakingSlots.id, slotId)).run();
  if (s.studentId) {
    notify(s.studentId, {
      type: "TEACHER_FEEDBACK",
      title: "Your speaking session was cancelled",
      body: `${nameOf(teacherId)} cancelled the session on ${formatSlotTime(s.startsAt)}.${why ? ` Reason: ${why}` : ""} You can book another time.`,
      url: "/dashboard/speaking-sessions",
      email: true,
    });
  }
}

// ---------- Student: booking ----------

/** Slots a student can still book, soonest first. */
export function listOpenSlots(now = new Date()) {
  const from = new Date(now.getTime() + BOOKING_LEAD_MINUTES * 60_000).toISOString();
  return db
    .select()
    .from(speakingSlots)
    .where(and(eq(speakingSlots.status, "OPEN"), gte(speakingSlots.startsAt, from)))
    .orderBy(asc(speakingSlots.startsAt))
    .limit(60)
    .all()
    .map((s) => ({ id: s.id, startsAt: s.startsAt, durationMinutes: s.durationMinutes, teacherName: nameOf(s.teacherId) ?? "Teacher" }));
}

/** Books a slot for the student. The database only lets one student win a slot, however many click at once. */
export function bookSlot(studentId: string, slotId: string, note?: string | null, now = new Date()): Slot {
  const s = getSlot(slotId);
  if (!s) throw new TeachingError("That time doesn't exist.", 404);
  if (s.teacherId === studentId) throw new TeachingError("You can't book your own session.");
  if (!canBook(s, now)) {
    throw new TeachingError(s.status === "OPEN" ? `Sessions must be booked at least ${BOOKING_LEAD_MINUTES / 60} hours ahead.` : "Someone else has already booked that time. Pick another.");
  }
  const mine = db.select().from(speakingSlots).where(and(eq(speakingSlots.studentId, studentId), inArray(speakingSlots.status, ["BOOKED", "IN_PROGRESS"]))).all();
  const upcoming = mine.filter((m) => new Date(m.startsAt).getTime() + m.durationMinutes * 60_000 > now.getTime());
  if (upcoming.length >= MAX_ACTIVE_BOOKINGS) throw new TeachingError(`You already have ${MAX_ACTIVE_BOOKINGS} upcoming sessions. Finish or cancel one before booking another.`);
  const clash = upcoming.find((m) => slotsOverlap(m, s));
  if (clash) throw new TeachingError("You already have a session at that time.");

  const res = db
    .update(speakingSlots)
    .set({ status: "BOOKED", studentId, bookedAt: now.toISOString(), studentNote: note ? cleanText(note).slice(0, 1000) || null : null })
    .where(and(eq(speakingSlots.id, slotId), eq(speakingSlots.status, "OPEN")))
    .run();
  if (res.changes !== 1) throw new TeachingError("Someone else has already booked that time. Pick another.");

  const studentName = nameOf(studentId);
  notify(studentId, { type: "TEACHER_FEEDBACK", title: "Your speaking session is booked", body: `${formatSlotTime(s.startsAt)} (Bangladesh time) with ${nameOf(s.teacherId)}. The meeting link is on your session page.`, url: "/dashboard/speaking-sessions", email: true });
  notify(s.teacherId, { type: "TEACHER_FEEDBACK", title: `${studentName} booked a speaking session`, body: formatSlotTime(s.startsAt), url: `/teacher/sessions/${slotId}` });
  return getSlot(slotId)!;
}

/** A student gives a slot back, up to two hours before it starts. It becomes bookable again. */
export function cancelBooking(studentId: string, slotId: string, now = new Date()) {
  const s = getSlot(slotId);
  if (!s || s.studentId !== studentId) throw new TeachingError("That session doesn't exist.", 404);
  if (!canStudentCancel(s, now)) throw new TeachingError(s.status === "BOOKED" ? "It's too close to the start to cancel here. Please message your teacher." : "This session can't be cancelled.");
  const res = db
    .update(speakingSlots)
    .set({ status: "OPEN", studentId: null, bookedAt: null, studentNote: null })
    .where(and(eq(speakingSlots.id, slotId), eq(speakingSlots.studentId, studentId), eq(speakingSlots.status, "BOOKED")))
    .run();
  if (res.changes !== 1) throw new TeachingError("This session can't be cancelled.");
  notify(s.teacherId, { type: "TEACHER_FEEDBACK", title: `${nameOf(studentId)} cancelled their session`, body: `${formatSlotTime(s.startsAt)} is open for booking again.`, url: "/teacher/sessions" });
}

export function listStudentSessions(studentId: string) {
  return db
    .select()
    .from(speakingSlots)
    .where(and(eq(speakingSlots.studentId, studentId), inArray(speakingSlots.status, ["BOOKED", "IN_PROGRESS", "COMPLETED", "NO_SHOW", "CANCELLED"])))
    .orderBy(desc(speakingSlots.startsAt))
    .all()
    .map((s) => ({
      ...s,
      teacherName: nameOf(s.teacherId) ?? "Teacher",
      // The teacher's private notes never leave the server.
      teacherNotes: undefined,
      meetingUrl: s.status === "BOOKED" || s.status === "IN_PROGRESS" ? s.meetingUrl : null,
    }));
}

// ---------- Teacher: running a session ----------

export function slotForTeacher(teacherId: string, slotId: string) {
  const s = getSlot(slotId);
  if (!s || s.teacherId !== teacherId) return null;
  const target = s.studentId ? (db.select({ t: profiles.ieltsTarget }).from(profiles).where(eq(profiles.userId, s.studentId)).get()?.t ?? null) : null;
  return { ...s, studentName: nameOf(s.studentId), targetBand: target };
}

export function startSession(teacherId: string, slotId: string, now = new Date()): Slot {
  const s = getSlot(slotId);
  if (!s || s.teacherId !== teacherId) throw new TeachingError("That session doesn't exist.", 404);
  if (!canStart(s, now)) throw new TeachingError(s.status === "BOOKED" ? "You can start a session 10 minutes before it begins, until it ends." : "This session can't be started.");
  const res = db.update(speakingSlots).set({ status: "IN_PROGRESS", startedAt: now.toISOString() }).where(and(eq(speakingSlots.id, slotId), eq(speakingSlots.status, "BOOKED"))).run();
  if (res.changes !== 1) throw new TeachingError("This session can't be started.");
  if (s.studentId) notify(s.studentId, { type: "TEACHER_FEEDBACK", title: "Your speaking session has started", body: "Join the meeting now from your session page.", url: "/dashboard/speaking-sessions" });
  return getSlot(slotId)!;
}

export function markNoShow(teacherId: string, slotId: string, now = new Date()) {
  const s = getSlot(slotId);
  if (!s || s.teacherId !== teacherId) throw new TeachingError("That session doesn't exist.", 404);
  if (!canMarkNoShow(s, now)) throw new TeachingError("You can mark a no-show 10 minutes after the start time.");
  db.update(speakingSlots).set({ status: "NO_SHOW" }).where(and(eq(speakingSlots.id, slotId), eq(speakingSlots.status, "BOOKED"))).run();
  if (s.studentId) notify(s.studentId, { type: "TEACHER_FEEDBACK", title: "You missed your speaking session", body: `${formatSlotTime(s.startsAt)}. You can book another time.`, url: "/dashboard/speaking-sessions" });
}

export type SessionInput = {
  teacherNotes?: string | null;
  fluencyBand?: number | null;
  lexicalBand?: number | null;
  grammarBand?: number | null;
  pronunciationBand?: number | null;
  overallBand?: number | null;
  feedback?: string | null;
};

const clean = (v: string | null | undefined) => (v ? cleanText(v).slice(0, MAX_FEEDBACK_CHARS) || null : null);

/**
 * Saves notes, scores and feedback for a session that has started. `complete` finishes it and shows the scores and
 * feedback to the student (all four criteria, an overall band and feedback are needed). A finished session can be corrected.
 */
export function saveSession(teacherId: string, slotId: string, input: SessionInput, complete: boolean): Slot {
  const s = getSlot(slotId);
  if (!s || s.teacherId !== teacherId) throw new TeachingError("That session doesn't exist.", 404);
  if (s.status !== "IN_PROGRESS" && s.status !== "COMPLETED") throw new TeachingError("Start the session before recording notes and scores.");

  const bands = { fluencyBand: input.fluencyBand ?? null, lexicalBand: input.lexicalBand ?? null, grammarBand: input.grammarBand ?? null, pronunciationBand: input.pronunciationBand ?? null, overallBand: input.overallBand ?? null };
  for (const v of Object.values(bands)) if (v !== null && !isValidBand(v)) throw new TeachingError(BAND_PROBLEM);
  const values = { ...bands, teacherNotes: clean(input.teacherNotes), feedback: clean(input.feedback) };

  const finishing = complete || s.status === "COMPLETED";
  if (finishing) {
    if (Object.values(bands).some((v) => v === null)) throw new TeachingError("Score all four criteria and the overall band before finishing.");
    if (!values.feedback) throw new TeachingError("Write some feedback for the student before finishing.");
  }

  db.update(speakingSlots)
    .set({ ...values, ...(complete && s.status === "IN_PROGRESS" ? { status: "COMPLETED" as const, completedAt: new Date().toISOString() } : {}) })
    .where(eq(speakingSlots.id, slotId))
    .run();

  if (complete && s.status === "IN_PROGRESS" && s.studentId) {
    notify(s.studentId, {
      type: "TEACHER_FEEDBACK",
      title: "Your speaking session feedback is ready",
      body: `${nameOf(teacherId)} estimates Band ${values.overallBand}. Read the feedback on your session page.`,
      url: "/dashboard/speaking-sessions",
      email: true,
    });
  }
  return getSlot(slotId)!;
}

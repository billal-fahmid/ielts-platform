import { db } from "@/lib/db";
import { classAttendance, classMaterials, liveClasses, users } from "@/lib/db/schema";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { cleanText, safeMediaUrl } from "@/lib/security/http";
import { notify } from "@/lib/services/notifications";
import { audienceIds } from "@/lib/services/assignments";
import { batchIdsOfStudent, courseIdsOfStudent } from "@/lib/services/audience";
import { getOwnBatch, TeachingError } from "@/lib/services/teaching";
import { ownsCourse } from "@/lib/services/teacher-content";
import { getMeetingProvider } from "@/lib/meetings/provider";
import { dhakaLocalToUtcIso, formatSlotTime } from "@/lib/reviews/rules";
import { attendanceOnJoin, canJoin, CLASS_DURATIONS, CLASS_MIN_LEAD_MINUTES, classEnd, classesOverlap, classState, dueReminders, initialReminderMarks, MAX_CLASS_TITLE, type AttendanceStatus } from "@/lib/classes/rules";

export type LiveClass = typeof liveClasses.$inferSelect;

const getClass = (id: string) => db.select().from(liveClasses).where(eq(liveClasses.id, id)).get();
const teacherName = (id: string) => db.select({ name: users.name }).from(users).where(eq(users.id, id)).get()?.name ?? "Your teacher";
const inAudience = (c: LiveClass, studentId: string) => audienceIds(c).includes(studentId);

function tell(c: LiveClass, title: string, body: string, opts: { email?: boolean } = {}) {
  for (const studentId of audienceIds(c)) notify(studentId, { type: "LIVE_CLASS", title, body, url: `/dashboard/classes/${c.id}`, email: opts.email });
}

// ---------- Teacher: scheduling ----------

export type ClassInput = {
  title: string;
  description?: string | null;
  batchId?: string | null;
  courseId?: string | null;
  startsAtLocal: string;
  durationMinutes: number;
  provider: string;
  meetingUrl?: string | null;
};

function checkInput(teacherId: string, input: ClassInput, existingId: string | null, now: Date) {
  const title = cleanText(input.title ?? "");
  if (!title) throw new TeachingError("Give the class a title.");
  if (title.length > MAX_CLASS_TITLE) throw new TeachingError(`The title is too long (${MAX_CLASS_TITLE} characters at most).`);
  if (!input.batchId && !input.courseId) throw new TeachingError("Choose who the class is for: one of your batches or one of your courses.");
  if (input.batchId && !getOwnBatch(teacherId, input.batchId)) throw new TeachingError("Choose one of your own batches.");
  if (input.courseId && !ownsCourse(teacherId, input.courseId)) throw new TeachingError("Choose one of your own courses.");
  const startsAt = dhakaLocalToUtcIso(input.startsAtLocal);
  if (!startsAt) throw new TeachingError("Choose a valid date and time.");
  if (!(CLASS_DURATIONS as readonly number[]).includes(input.durationMinutes)) throw new TeachingError(`The class length must be ${CLASS_DURATIONS.join(", ")} minutes.`);
  const provider = getMeetingProvider(input.provider);
  if (!provider) throw new TeachingError("Choose how the class will be held.");
  if (provider.needsUrl) {
    const problem = provider.validateUrl(input.meetingUrl ?? "");
    if (problem) throw new TeachingError(problem);
  }
  const candidate = { startsAt, durationMinutes: input.durationMinutes };
  const clash = db
    .select()
    .from(liveClasses)
    .where(and(eq(liveClasses.teacherId, teacherId), eq(liveClasses.status, "SCHEDULED")))
    .all()
    .find((c) => c.id !== existingId && classesOverlap(c, candidate));
  if (clash) throw new TeachingError(`That overlaps “${clash.title}” (${formatSlotTime(clash.startsAt)}).`);
  return { title, startsAt, provider };
}

export function createClass(teacherId: string, input: ClassInput, now = new Date()): LiveClass {
  const { title, startsAt, provider } = checkInput(teacherId, input, null, now);
  if (new Date(startsAt).getTime() - now.getTime() < CLASS_MIN_LEAD_MINUTES * 60_000) throw new TeachingError(`Schedule the class at least ${CLASS_MIN_LEAD_MINUTES} minutes from now.`);
  const id = newId();
  const meetingUrl = provider.createMeeting({ classId: id, title, startsAt, durationMinutes: input.durationMinutes }, input.meetingUrl).url;
  db.insert(liveClasses)
    .values({
      id,
      teacherId,
      batchId: input.batchId || null,
      courseId: input.courseId || null,
      title,
      description: input.description ? cleanText(input.description).slice(0, 2000) || null : null,
      startsAt,
      durationMinutes: input.durationMinutes,
      provider: provider.id,
      meetingUrl,
      ...initialReminderMarks({ startsAt, durationMinutes: input.durationMinutes }, now),
    })
    .run();
  const c = getClass(id)!;
  tell(c, `New live class: ${title}`, `${formatSlotTime(startsAt)} (Bangladesh time) with ${teacherName(teacherId)}.`);
  return c;
}

/** Edits a class. Moving it tells the audience and restarts its reminders. Finished or cancelled classes are read-only. */
export function updateClass(teacherId: string, classId: string, input: ClassInput, now = new Date()): LiveClass {
  const c = getClass(classId);
  if (!c || c.teacherId !== teacherId) throw new TeachingError("That class doesn't exist.", 404);
  if (c.status === "CANCELLED") throw new TeachingError("This class was cancelled. Schedule a new one instead.");
  if (classState(c, now) === "FINISHED") throw new TeachingError("This class is over, so it can't be changed. You can still add materials and a recording.");
  const { title, startsAt, provider } = checkInput(teacherId, input, classId, now);
  const moved = startsAt !== c.startsAt || input.durationMinutes !== c.durationMinutes;
  if (moved && new Date(startsAt).getTime() - now.getTime() < CLASS_MIN_LEAD_MINUTES * 60_000) throw new TeachingError(`Schedule the class at least ${CLASS_MIN_LEAD_MINUTES} minutes from now.`);
  if ((input.batchId || null) !== c.batchId || (input.courseId || null) !== c.courseId) {
    const attended = db.select().from(classAttendance).where(eq(classAttendance.classId, classId)).get();
    if (attended) throw new TeachingError("Attendance has been recorded, so you can't change who the class is for.");
  }
  const meetingUrl = provider.id === c.provider && !provider.needsUrl ? c.meetingUrl : provider.createMeeting({ classId, title, startsAt, durationMinutes: input.durationMinutes }, input.meetingUrl).url;
  db.update(liveClasses)
    .set({
      batchId: input.batchId || null,
      courseId: input.courseId || null,
      title,
      description: input.description ? cleanText(input.description).slice(0, 2000) || null : null,
      startsAt,
      durationMinutes: input.durationMinutes,
      provider: provider.id,
      meetingUrl,
      ...(moved ? initialReminderMarks({ startsAt, durationMinutes: input.durationMinutes }, now) : {}),
    })
    .where(eq(liveClasses.id, classId))
    .run();
  const updated = getClass(classId)!;
  if (moved) tell(updated, `Class moved: ${title}`, `Now ${formatSlotTime(startsAt)} (Bangladesh time).`, { email: true });
  return updated;
}

export function cancelClass(teacherId: string, classId: string, reason?: string | null) {
  const c = getClass(classId);
  if (!c || c.teacherId !== teacherId) throw new TeachingError("That class doesn't exist.", 404);
  if (c.status === "CANCELLED") throw new TeachingError("This class is already cancelled.");
  if (classEnd(c) <= Date.now()) throw new TeachingError("This class is over, so it can't be cancelled.");
  const why = reason ? cleanText(reason).slice(0, 500) || null : null;
  db.update(liveClasses).set({ status: "CANCELLED", cancelReason: why }).where(eq(liveClasses.id, classId)).run();
  tell(c, `Class cancelled: ${c.title}`, `The class on ${formatSlotTime(c.startsAt)} was cancelled.${why ? ` Reason: ${why}` : ""}`, { email: true });
}

// ---------- Teacher: views ----------

const audienceLabel = (c: LiveClass) => (c.batchId ? "Batch" : "Course");

export function listTeacherClasses(teacherId: string) {
  return db
    .select()
    .from(liveClasses)
    .where(eq(liveClasses.teacherId, teacherId))
    .orderBy(asc(liveClasses.startsAt))
    .all()
    .map((c) => ({ ...c, audienceSize: audienceIds(c).length, attended: db.select().from(classAttendance).where(and(eq(classAttendance.classId, c.id), inArray(classAttendance.status, ["PRESENT", "LATE"]))).all().length, audienceKind: audienceLabel(c) }));
}

export function upcomingClassCount(teacherId: string, now = new Date()) {
  return db
    .select()
    .from(liveClasses)
    .where(and(eq(liveClasses.teacherId, teacherId), eq(liveClasses.status, "SCHEDULED")))
    .all()
    .filter((c) => classEnd(c) > now.getTime()).length;
}

/** A class with its roster (each student in the audience and their attendance) and materials, for its own teacher only. */
export function classForTeacher(teacherId: string, classId: string) {
  const c = getClass(classId);
  if (!c || c.teacherId !== teacherId) return null;
  const ids = audienceIds(c);
  const students = ids.length ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, ids)).all() : [];
  const att = new Map(db.select().from(classAttendance).where(eq(classAttendance.classId, classId)).all().map((a) => [a.studentId, a]));
  return {
    class: c,
    roster: students.sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ student: s, attendance: att.get(s.id) ?? null })),
    materials: db.select().from(classMaterials).where(eq(classMaterials.classId, classId)).orderBy(asc(classMaterials.createdAt)).all(),
  };
}

/** The teacher sets (or clears, with null) a student's attendance. Only students the class is for. */
export function setAttendance(teacherId: string, classId: string, studentId: string, status: AttendanceStatus | null) {
  const c = getClass(classId);
  if (!c || c.teacherId !== teacherId) throw new TeachingError("That class doesn't exist.", 404);
  if (!inAudience(c, studentId)) throw new TeachingError("That student isn't part of this class.");
  if (status === null) {
    db.delete(classAttendance).where(and(eq(classAttendance.classId, classId), eq(classAttendance.studentId, studentId))).run();
    return;
  }
  if (!["PRESENT", "LATE", "ABSENT"].includes(status)) throw new TeachingError("Choose present, late or absent.");
  const existing = db.select().from(classAttendance).where(and(eq(classAttendance.classId, classId), eq(classAttendance.studentId, studentId))).get();
  if (existing) db.update(classAttendance).set({ status, markedBy: "TEACHER" }).where(eq(classAttendance.id, existing.id)).run();
  else db.insert(classAttendance).values({ id: newId(), classId, studentId, status, markedBy: "TEACHER" }).onConflictDoNothing().run();
}

export function addMaterial(teacherId: string, classId: string, input: { title: string; url: string }) {
  const c = getClass(classId);
  if (!c || c.teacherId !== teacherId) throw new TeachingError("That class doesn't exist.", 404);
  const title = cleanText(input.title ?? "").slice(0, 120);
  if (!title) throw new TeachingError("Give the material a name.");
  if (!safeMediaUrl(input.url)) throw new TeachingError("Add an uploaded file or a full https:// link.");
  if (db.select().from(classMaterials).where(eq(classMaterials.classId, classId)).all().length >= 30) throw new TeachingError("A class can have at most 30 materials.");
  const id = newId();
  db.insert(classMaterials).values({ id, classId, title, url: input.url.trim() }).run();
  return db.select().from(classMaterials).where(eq(classMaterials.id, id)).get()!;
}

export function removeMaterial(teacherId: string, classId: string, materialId: string) {
  const c = getClass(classId);
  if (!c || c.teacherId !== teacherId) throw new TeachingError("That class doesn't exist.", 404);
  db.delete(classMaterials).where(and(eq(classMaterials.id, materialId), eq(classMaterials.classId, classId))).run();
}

/** Adds (or clears) the recording after the class has started. The audience is told the first time. */
export function setRecording(teacherId: string, classId: string, url: string | null, now = new Date()) {
  const c = getClass(classId);
  if (!c || c.teacherId !== teacherId) throw new TeachingError("That class doesn't exist.", 404);
  if (c.status === "CANCELLED") throw new TeachingError("This class was cancelled.");
  if (classState(c, now) === "UPCOMING") throw new TeachingError("Add the recording once the class has started.");
  const clean = url?.trim() || null;
  if (clean && !safeMediaUrl(clean)) throw new TeachingError("Add an uploaded video or a full https:// link.");
  db.update(liveClasses).set({ recordingUrl: clean }).where(eq(liveClasses.id, classId)).run();
  if (clean && !c.recordingUrl) tell(c, `Recording available: ${c.title}`, "Watch the class recording from the class page.");
}

// ---------- Student ----------

/** Classes for this student: their batches' and their enrolled courses'. Cancelled ones stay listed so nobody turns up. */
export function classesForStudent(studentId: string, now = new Date()) {
  const batchIds = batchIdsOfStudent(studentId);
  const courseIds = courseIdsOfStudent(studentId);
  const all = db.select().from(liveClasses).orderBy(asc(liveClasses.startsAt)).all().filter((c) => (c.batchId && batchIds.includes(c.batchId)) || (c.courseId && courseIds.includes(c.courseId)));
  const mine = new Map(db.select().from(classAttendance).where(eq(classAttendance.studentId, studentId)).all().map((a) => [a.classId, a]));
  return all.map((c) => ({ class: c, state: classState(c, now), teacherName: teacherName(c.teacherId), attendance: mine.get(c.id) ?? null, joinable: canJoin(c, now) }));
}

export function classForStudent(studentId: string, classId: string, now = new Date()) {
  const found = classesForStudent(studentId, now).find((r) => r.class.id === classId);
  if (!found) return null;
  return { ...found, materials: db.select().from(classMaterials).where(eq(classMaterials.classId, classId)).orderBy(asc(classMaterials.createdAt)).all() };
}

/** The Join button: checks the student belongs to the class and the time window, records attendance, returns the link. */
export function joinClass(studentId: string, classId: string, now = new Date()): { meetingUrl: string } {
  const c = getClass(classId);
  // The same message whether the class is missing or isn't for this student.
  if (!c || !inAudience(c, studentId)) throw new TeachingError("That class isn't available to you.", 404);
  if (c.status === "CANCELLED") throw new TeachingError("This class was cancelled.");
  if (!canJoin(c, now)) throw new TeachingError(classState(c, now) === "UPCOMING" ? "The class isn't open yet. You can join 10 minutes before it starts." : "This class has ended.");
  const existing = db.select().from(classAttendance).where(and(eq(classAttendance.classId, classId), eq(classAttendance.studentId, studentId))).get();
  const status = attendanceOnJoin(c, now);
  if (!existing) db.insert(classAttendance).values({ id: newId(), classId, studentId, status, joinedAt: now.toISOString(), markedBy: "SELF" }).onConflictDoNothing().run();
  else if (!existing.joinedAt) db.update(classAttendance).set({ joinedAt: now.toISOString() }).where(eq(classAttendance.id, existing.id)).run();
  return { meetingUrl: c.meetingUrl };
}

// ---------- Reminders ----------

let lastReminderRun = 0;

/**
 * Sends the "tomorrow" and "in an hour" reminders that are due. Safe to call often: each reminder goes out once, and
 * calls closer than a minute apart do nothing. The dashboards call it as people browse, and a scheduler can call it
 * through /api/webhooks/cron/reminders so reminders don't depend on anyone visiting.
 */
export function sendDueReminders(now = new Date(), opts: { force?: boolean } = {}): number {
  if (!opts.force && now.getTime() - lastReminderRun < 60_000) return 0;
  lastReminderRun = now.getTime();
  let sent = 0;
  const upcoming = db.select().from(liveClasses).where(eq(liveClasses.status, "SCHEDULED")).all().filter((c) => classEnd(c) > now.getTime());
  for (const c of upcoming) {
    for (const kind of dueReminders(c, now)) {
      // Claim the reminder first so two calls at once can't send it twice.
      const claimed = db
        .update(liveClasses)
        .set(kind === "DAY" ? { dayReminderSentAt: now.toISOString() } : { hourReminderSentAt: now.toISOString() })
        .where(and(eq(liveClasses.id, c.id), isNull(kind === "DAY" ? liveClasses.dayReminderSentAt : liveClasses.hourReminderSentAt)))
        .run();
      if (claimed.changes !== 1) continue;
      tell(c, kind === "DAY" ? `Class tomorrow: ${c.title}` : `Class starts soon: ${c.title}`, `${formatSlotTime(c.startsAt)} (Bangladesh time) with ${teacherName(c.teacherId)}.${kind === "HOUR" ? " Join from your class page." : ""}`, { email: kind === "HOUR" });
      sent++;
    }
  }
  return sent;
}

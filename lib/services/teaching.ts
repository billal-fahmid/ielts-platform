import { db } from "@/lib/db";
import { assignments, batchMembers, batches, courses, enrollments, speakingSlots, users, writingReviews } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { cleanText } from "@/lib/security/http";
import { notify } from "@/lib/services/notifications";
import { ownedCourseIds, ownsCourse } from "@/lib/services/teacher-content";

/** A problem the teacher can fix; its message is shown to them as-is. */
export class TeachingError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export type Batch = typeof batches.$inferSelect;

// ---------- Who a teacher's students are ----------

/**
 * A teacher's students are the students in their batches, the students enrolled in their courses, and the students
 * whose writing they have picked up for review or whom they have taught in a speaking session.
 * Teachers can see progress only for these students, never for anyone else.
 */
export function studentIdsForTeacher(teacherId: string): string[] {
  const ids = new Set<string>();
  const myBatches = db.select({ id: batches.id }).from(batches).where(eq(batches.teacherId, teacherId)).all().map((b) => b.id);
  if (myBatches.length) {
    for (const m of db.select().from(batchMembers).where(inArray(batchMembers.batchId, myBatches)).all()) ids.add(m.studentId);
  }
  const myCourses = ownedCourseIds(teacherId);
  if (myCourses.length) {
    for (const e of db.select().from(enrollments).where(inArray(enrollments.courseId, myCourses)).all()) if (e.status !== "DROPPED") ids.add(e.userId);
  }
  for (const r of db.select().from(writingReviews).where(eq(writingReviews.teacherId, teacherId)).all()) if (r.status !== "CANCELLED") ids.add(r.studentId);
  for (const x of db.select().from(speakingSlots).where(eq(speakingSlots.teacherId, teacherId)).all()) if (x.studentId && x.status !== "CANCELLED" && x.status !== "OPEN") ids.add(x.studentId);
  return [...ids];
}

export const isStudentOfTeacher = (teacherId: string, studentId: string) => studentIdsForTeacher(teacherId).includes(studentId);

// ---------- Batches ----------

export type BatchInput = {
  name: string;
  description?: string | null;
  courseId?: string | null;
  capacity?: number | null;
  startsOn?: string | null;
  endsOn?: string | null;
  status?: "ACTIVE" | "ARCHIVED";
};

const isDay = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));

function checkBatchInput(teacherId: string, input: BatchInput) {
  if (!input.name || !cleanText(input.name)) throw new TeachingError("Give the batch a name.");
  if (input.courseId && !ownsCourse(teacherId, input.courseId)) throw new TeachingError("Choose one of your own courses.");
  if (input.capacity != null && (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 500)) {
    throw new TeachingError("Capacity must be a whole number from 1 to 500, or empty.");
  }
  for (const [v, label] of [[input.startsOn, "Start date"], [input.endsOn, "End date"]] as const) {
    if (v && !isDay(v)) throw new TeachingError(`${label} must be a date like 2026-12-31.`);
  }
  if (input.startsOn && input.endsOn && input.endsOn < input.startsOn) throw new TeachingError("The batch can't end before it starts.");
}

/** The batch, if it belongs to this teacher. */
export function getOwnBatch(teacherId: string, batchId: string): Batch | null {
  const b = db.select().from(batches).where(eq(batches.id, batchId)).get();
  return b && b.teacherId === teacherId ? b : null;
}

export function memberCount(batchId: string): number {
  return db.select().from(batchMembers).where(eq(batchMembers.batchId, batchId)).all().length;
}

export function listBatches(teacherId: string) {
  return db
    .select()
    .from(batches)
    .where(eq(batches.teacherId, teacherId))
    .all()
    .sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "ACTIVE" ? -1 : 1))
    .map((b) => ({ ...b, members: memberCount(b.id), courseTitle: b.courseId ? (db.select().from(courses).where(eq(courses.id, b.courseId)).get()?.title ?? null) : null }));
}

export function createBatch(teacherId: string, input: BatchInput): Batch {
  checkBatchInput(teacherId, input);
  const row = {
    id: newId(),
    teacherId,
    name: cleanText(input.name).slice(0, 100),
    description: input.description ? cleanText(input.description).slice(0, 1000) : null,
    courseId: input.courseId || null,
    capacity: input.capacity ?? null,
    startsOn: input.startsOn || null,
    endsOn: input.endsOn || null,
    status: input.status ?? "ACTIVE",
  } as const;
  db.insert(batches).values(row).run();
  return getOwnBatch(teacherId, row.id)!;
}

export function updateBatch(teacherId: string, batchId: string, input: BatchInput): Batch {
  const existing = getOwnBatch(teacherId, batchId);
  if (!existing) throw new TeachingError("That batch doesn't exist.", 404);
  checkBatchInput(teacherId, input);
  const count = memberCount(batchId);
  if (input.capacity != null && input.capacity < count) throw new TeachingError(`This batch already has ${count} students, so the capacity can't be lower than that.`);
  db.update(batches)
    .set({
      name: cleanText(input.name).slice(0, 100),
      description: input.description ? cleanText(input.description).slice(0, 1000) : null,
      courseId: input.courseId || null,
      capacity: input.capacity ?? null,
      startsOn: input.startsOn || null,
      endsOn: input.endsOn || null,
      status: input.status ?? existing.status,
    })
    .where(eq(batches.id, batchId))
    .run();
  return getOwnBatch(teacherId, batchId)!;
}

export function deleteBatch(teacherId: string, batchId: string) {
  if (!getOwnBatch(teacherId, batchId)) throw new TeachingError("That batch doesn't exist.", 404);
  if (db.select().from(assignments).where(eq(assignments.batchId, batchId)).get()) {
    throw new TeachingError("Assignments are set for this batch, so it can't be deleted. Archive it instead.");
  }
  db.delete(batchMembers).where(eq(batchMembers.batchId, batchId)).run();
  db.delete(batches).where(eq(batches.id, batchId)).run();
}

export function batchMembersDetailed(batchId: string) {
  return db
    .select({ studentId: users.id, name: users.name, email: users.email, joinedAt: batchMembers.joinedAt })
    .from(batchMembers)
    .innerJoin(users, eq(users.id, batchMembers.studentId))
    .where(eq(batchMembers.batchId, batchId))
    .all()
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Adds an existing student account to the batch by email, and tells them. */
export function addMemberByEmail(teacherId: string, batchId: string, email: string) {
  const batch = getOwnBatch(teacherId, batchId);
  if (!batch) throw new TeachingError("That batch doesn't exist.", 404);
  if (batch.status === "ARCHIVED") throw new TeachingError("This batch is archived. Make it active to add students.");

  const student = db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).get();
  if (!student || student.role !== "STUDENT") throw new TeachingError("No student account uses that email address. Ask them to register first.", 404);
  if (db.select().from(batchMembers).where(and(eq(batchMembers.batchId, batchId), eq(batchMembers.studentId, student.id))).get()) {
    throw new TeachingError(`${student.name} is already in this batch.`);
  }
  if (batch.capacity != null && memberCount(batchId) >= batch.capacity) throw new TeachingError(`This batch is full (${batch.capacity} students).`);

  db.insert(batchMembers).values({ id: newId(), batchId, studentId: student.id }).onConflictDoNothing().run();
  notify(student.id, { type: "COURSE", title: `You were added to the batch “${batch.name}”`, body: "Your teacher will share assignments and classes with this batch.", url: "/dashboard/assignments" });
  return { studentId: student.id, name: student.name, email: student.email };
}

export function removeMember(teacherId: string, batchId: string, studentId: string) {
  if (!getOwnBatch(teacherId, batchId)) throw new TeachingError("That batch doesn't exist.", 404);
  db.delete(batchMembers).where(and(eq(batchMembers.batchId, batchId), eq(batchMembers.studentId, studentId))).run();
}

export function batchesOfStudent(teacherId: string, studentId: string) {
  return db
    .select({ id: batches.id, name: batches.name })
    .from(batchMembers)
    .innerJoin(batches, eq(batches.id, batchMembers.batchId))
    .where(and(eq(batchMembers.studentId, studentId), eq(batches.teacherId, teacherId)))
    .all();
}

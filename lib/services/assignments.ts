import { db } from "@/lib/db";
import { assignmentSubmissions, assignments, batchMembers, batches, courses, enrollments, users } from "@/lib/db/schema";
import { and, eq, inArray, or } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { cleanText, safeMediaUrl } from "@/lib/security/http";
import { notify } from "@/lib/services/notifications";
import { ownsCourse } from "@/lib/services/teacher-content";
import { getOwnBatch, TeachingError } from "@/lib/services/teaching";
import { isWebLink, MAX_ANSWER_LENGTH, scoreProblem, studentStatus } from "@/lib/teaching/rules";

export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof assignmentSubmissions.$inferSelect;

export type AssignmentInput = {
  title: string;
  instructions: string;
  batchId?: string | null;
  courseId?: string | null;
  attachmentUrl?: string | null;
  dueAt?: string | null;
  maxScore?: number;
  published?: boolean;
};

const isDay = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));

// ---------- Audience ----------

/** The students an assignment is for: everyone in its batch, or everyone enrolled in its course. */
export function audienceIds(a: Pick<Assignment, "batchId" | "courseId">): string[] {
  const ids = new Set<string>();
  if (a.batchId) for (const m of db.select().from(batchMembers).where(eq(batchMembers.batchId, a.batchId)).all()) ids.add(m.studentId);
  if (a.courseId) {
    for (const e of db.select().from(enrollments).where(eq(enrollments.courseId, a.courseId)).all()) if (e.status !== "DROPPED") ids.add(e.userId);
  }
  return [...ids];
}

// ---------- Teacher side ----------

function checkInput(teacherId: string, input: AssignmentInput) {
  if (!input.title || !cleanText(input.title)) throw new TeachingError("Give the assignment a title.");
  if (!input.instructions || !cleanText(input.instructions)) throw new TeachingError("Write the instructions students should follow.");
  if (input.instructions.length > MAX_ANSWER_LENGTH) throw new TeachingError("The instructions are too long.");
  if (!input.batchId && !input.courseId) throw new TeachingError("Choose who it is for: one of your batches or one of your courses.");
  if (input.batchId && !getOwnBatch(teacherId, input.batchId)) throw new TeachingError("Choose one of your own batches.");
  if (input.courseId && !ownsCourse(teacherId, input.courseId)) throw new TeachingError("Choose one of your own courses.");
  if (input.dueAt && !isDay(input.dueAt)) throw new TeachingError("The due date must be a date like 2026-12-31.");
  const max = input.maxScore ?? 100;
  if (!Number.isInteger(max) || max < 1 || max > 1000) throw new TeachingError("The maximum score must be a whole number from 1 to 1000.");
  if (input.attachmentUrl && !safeMediaUrl(input.attachmentUrl)) throw new TeachingError("The attachment must be an uploaded file or a full http(s) link.");
}

/** Tells the audience about a newly published assignment, once. */
function announce(a: Assignment) {
  for (const studentId of audienceIds(a)) {
    notify(studentId, { type: "ASSIGNMENT", title: `New assignment: ${a.title}`, body: a.dueAt ? `Due ${a.dueAt}.` : "Open it to see what to do.", url: `/dashboard/assignments/${a.id}` });
  }
  db.update(assignments).set({ publishedAt: new Date().toISOString() }).where(eq(assignments.id, a.id)).run();
}

export function getOwnAssignment(teacherId: string, id: string): Assignment | null {
  const a = db.select().from(assignments).where(eq(assignments.id, id)).get();
  return a && a.teacherId === teacherId ? a : null;
}

export function createAssignment(teacherId: string, input: AssignmentInput): Assignment {
  checkInput(teacherId, input);
  const id = newId();
  db.insert(assignments)
    .values({
      id,
      teacherId,
      batchId: input.batchId || null,
      courseId: input.courseId || null,
      title: cleanText(input.title).slice(0, 160),
      instructions: input.instructions.trim(),
      attachmentUrl: input.attachmentUrl || null,
      dueAt: input.dueAt || null,
      maxScore: input.maxScore ?? 100,
      published: !!input.published,
    })
    .run();
  const a = getOwnAssignment(teacherId, id)!;
  if (a.published) announce(a);
  return getOwnAssignment(teacherId, id)!;
}

export function updateAssignment(teacherId: string, id: string, input: AssignmentInput): Assignment {
  const existing = getOwnAssignment(teacherId, id);
  if (!existing) throw new TeachingError("That assignment doesn't exist.", 404);
  checkInput(teacherId, input);
  const submissionCount = db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.assignmentId, id)).all().length;
  const max = input.maxScore ?? existing.maxScore;
  if (submissionCount > 0) {
    // Changing who it is for or the scoring after work came in would make existing scores meaningless.
    if ((input.batchId || null) !== existing.batchId || (input.courseId || null) !== existing.courseId) throw new TeachingError("Students have already submitted work, so you can't change who this assignment is for.");
    if (max !== existing.maxScore) throw new TeachingError("Students have already submitted work, so you can't change the maximum score.");
  }
  db.update(assignments)
    .set({
      batchId: input.batchId || null,
      courseId: input.courseId || null,
      title: cleanText(input.title).slice(0, 160),
      instructions: input.instructions.trim(),
      attachmentUrl: input.attachmentUrl || null,
      dueAt: input.dueAt || null,
      maxScore: max,
      published: !!input.published,
    })
    .where(eq(assignments.id, id))
    .run();
  const a = getOwnAssignment(teacherId, id)!;
  if (a.published && !a.publishedAt) announce(a);
  return getOwnAssignment(teacherId, id)!;
}

export function deleteAssignment(teacherId: string, id: string) {
  if (!getOwnAssignment(teacherId, id)) throw new TeachingError("That assignment doesn't exist.", 404);
  if (db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.assignmentId, id)).get()) {
    throw new TeachingError("Students have already submitted work, so it can't be deleted. Unpublish it to hide it.");
  }
  db.delete(assignments).where(eq(assignments.id, id)).run();
}

export function listTeacherAssignments(teacherId: string) {
  return db
    .select()
    .from(assignments)
    .where(eq(assignments.teacherId, teacherId))
    .all()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((a) => {
      const audience = audienceIds(a);
      const subs = db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.assignmentId, a.id)).all().filter((s) => audience.includes(s.studentId));
      return {
        ...a,
        audience: audience.length,
        submitted: subs.length,
        toGrade: subs.filter((s) => s.status === "SUBMITTED").length,
        target: a.batchId ? (db.select().from(batches).where(eq(batches.id, a.batchId)).get()?.name ?? "Batch") : (db.select().from(courses).where(eq(courses.id, a.courseId!)).get()?.title ?? "Course"),
      };
    });
}

/** Every student the assignment is for, with their submission if there is one. */
export function submissionsForTeacher(teacherId: string, id: string) {
  const a = getOwnAssignment(teacherId, id);
  if (!a) return null;
  const audience = audienceIds(a);
  const students = audience.length ? db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, audience)).all() : [];
  const subs = new Map(db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.assignmentId, id)).all().map((s) => [s.studentId, s]));
  return {
    assignment: a,
    rows: students.sort((x, y) => x.name.localeCompare(y.name)).map((s) => ({ student: s, submission: subs.get(s.id) ?? null })),
  };
}

export function gradeSubmission(teacherId: string, assignmentId: string, submissionId: string, input: { score: number; feedback?: string | null }): Submission {
  const a = getOwnAssignment(teacherId, assignmentId);
  if (!a) throw new TeachingError("That assignment doesn't exist.", 404);
  const sub = db.select().from(assignmentSubmissions).where(and(eq(assignmentSubmissions.id, submissionId), eq(assignmentSubmissions.assignmentId, assignmentId))).get();
  if (!sub) throw new TeachingError("That submission doesn't exist.", 404);
  const problem = scoreProblem(input.score, a.maxScore);
  if (problem) throw new TeachingError(problem);
  const feedback = input.feedback ? cleanText(input.feedback).slice(0, 5000) : null;

  db.update(assignmentSubmissions)
    .set({ status: "GRADED", score: input.score, feedback, gradedAt: new Date().toISOString(), gradedBy: teacherId })
    .where(eq(assignmentSubmissions.id, submissionId))
    .run();
  notify(sub.studentId, {
    type: "TEACHER_FEEDBACK",
    title: `Your assignment “${a.title}” was graded`,
    body: `Score: ${input.score} / ${a.maxScore}.${feedback ? " Your teacher left feedback." : ""}`,
    url: `/dashboard/assignments/${a.id}`,
    email: true,
  });
  return db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.id, submissionId)).get()!;
}

// ---------- Student side ----------

/** Published assignments that are for this student: their batches' and their courses'. */
function assignmentsVisibleTo(studentId: string): Assignment[] {
  const batchIds = db.select({ id: batchMembers.batchId }).from(batchMembers).innerJoin(batches, eq(batches.id, batchMembers.batchId)).where(eq(batchMembers.studentId, studentId)).all().map((r) => r.id);
  const courseIds = db.select().from(enrollments).where(eq(enrollments.userId, studentId)).all().filter((e) => e.status !== "DROPPED").map((e) => e.courseId);
  const conditions = [];
  if (batchIds.length) conditions.push(inArray(assignments.batchId, batchIds));
  if (courseIds.length) conditions.push(inArray(assignments.courseId, courseIds));
  if (!conditions.length) return [];
  return db
    .select()
    .from(assignments)
    .where(and(eq(assignments.published, true), or(...conditions)))
    .all();
}

export function assignmentsForStudent(studentId: string, now = new Date()) {
  const subs = new Map(db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.studentId, studentId)).all().map((s) => [s.assignmentId, s]));
  const teacherNames = new Map(db.select({ id: users.id, name: users.name }).from(users).all().map((u) => [u.id, u.name]));
  return assignmentsVisibleTo(studentId)
    .map((a) => {
      const submission = subs.get(a.id) ?? null;
      return { assignment: a, submission, status: studentStatus(a, submission, now), teacherName: teacherNames.get(a.teacherId) ?? "Your teacher" };
    })
    .sort((x, y) => (x.assignment.dueAt ?? "9999").localeCompare(y.assignment.dueAt ?? "9999") || y.assignment.createdAt.localeCompare(x.assignment.createdAt));
}

export function getAssignmentForStudent(studentId: string, id: string) {
  return assignmentsForStudent(studentId).find((r) => r.assignment.id === id) ?? null;
}

/** Hands in (or edits) an answer. Once the teacher has graded it, it is locked. */
export function submitAssignment(studentId: string, id: string, input: { answerText?: string; linkUrl?: string | null }): Submission {
  const found = getAssignmentForStudent(studentId, id);
  if (!found) throw new TeachingError("That assignment isn't available to you.", 404);
  if (found.submission?.status === "GRADED") throw new TeachingError("Your teacher has already graded this, so it can't be changed.");

  const answerText = (input.answerText ?? "").trim();
  const linkUrl = input.linkUrl?.trim() || null;
  if (!answerText && !linkUrl) throw new TeachingError("Write your answer or add a link before you submit.");
  if (answerText.length > MAX_ANSWER_LENGTH) throw new TeachingError("Your answer is too long.");
  if (linkUrl && !isWebLink(linkUrl)) throw new TeachingError("The link must start with http:// or https://.");

  const now = new Date().toISOString();
  if (found.submission) {
    db.update(assignmentSubmissions).set({ answerText, linkUrl, submittedAt: now }).where(eq(assignmentSubmissions.id, found.submission.id)).run();
    return db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.id, found.submission.id)).get()!;
  }
  const row = { id: newId(), assignmentId: id, studentId, answerText, linkUrl, submittedAt: now };
  db.insert(assignmentSubmissions).values(row).onConflictDoNothing().run();
  const student = db.select().from(users).where(eq(users.id, studentId)).get();
  notify(found.assignment.teacherId, { type: "ASSIGNMENT", title: `${student?.name ?? "A student"} submitted “${found.assignment.title}”`, url: `/teacher/assignments/${id}` });
  return db.select().from(assignmentSubmissions).where(and(eq(assignmentSubmissions.assignmentId, id), eq(assignmentSubmissions.studentId, studentId))).get()!;
}

/** How many assignments are waiting for the student (to do or overdue): shown as a hint in the dashboard. */
export const openAssignmentCount = (studentId: string) => assignmentsForStudent(studentId).filter((r) => r.status === "TODO" || r.status === "OVERDUE").length;

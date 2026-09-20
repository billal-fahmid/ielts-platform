import { db } from "@/lib/db";
import { courses, enrollments, lessons, modules, progress } from "@/lib/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { notify } from "@/lib/services/notifications";
import { getUserProgressForCourse } from "@/lib/services/courses";

export type Enrollment = typeof enrollments.$inferSelect;

export function getEnrollment(userId: string, courseId: string) {
  return db.select().from(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))).get();
}

export function isEnrolled(userId: string, courseId: string) {
  const e = getEnrollment(userId, courseId);
  return !!e && e.status !== "DROPPED";
}

export function enrollmentCount(courseId: string): number {
  return db
    .select({ n: sql<number>`count(*)` })
    .from(enrollments)
    .where(and(eq(enrollments.courseId, courseId), inArray(enrollments.status, ["ACTIVE", "COMPLETED"])))
    .get()?.n ?? 0;
}

/**
 * Enrols the student in a published course (or re-activates a dropped enrolment; progress is kept).
 * Returns null if the course doesn't exist or isn't published.
 */
export function enroll(userId: string, courseId: string, opts: { silent?: boolean } = {}): { enrollment: Enrollment; created: boolean } | null {
  const course = db.select().from(courses).where(eq(courses.id, courseId)).get();
  if (!course || !course.published) return null;

  const existing = getEnrollment(userId, courseId);
  if (existing && existing.status !== "DROPPED") return { enrollment: existing, created: false };

  if (existing) {
    db.update(enrollments).set({ status: "ACTIVE", completedAt: null }).where(eq(enrollments.id, existing.id)).run();
  } else {
    // The unique index makes a double-click harmless: the second insert is ignored.
    db.insert(enrollments).values({ id: newId(), userId, courseId }).onConflictDoNothing().run();
  }
  if (!opts.silent) {
    notify(userId, { type: "COURSE", title: `You're enrolled in ${course.title}`, body: "Open the course to start your first lesson.", url: `/dashboard/courses/${course.slug}` });
  }
  return { enrollment: getEnrollment(userId, courseId)!, created: !existing };
}

/** Leaves a course. Lesson progress is kept in case the student comes back. */
export function unenroll(userId: string, courseId: string): boolean {
  const existing = getEnrollment(userId, courseId);
  if (!existing || existing.status === "DROPPED") return false;
  db.update(enrollments).set({ status: "DROPPED" }).where(eq(enrollments.id, existing.id)).run();
  return true;
}

export function courseIdForLesson(lessonId: string): string | null {
  const row = db
    .select({ courseId: modules.courseId })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .where(eq(lessons.id, lessonId))
    .get();
  return row?.courseId ?? null;
}

/**
 * Called after a lesson is completed. Opening or finishing a lesson counts as enrolling, and
 * finishing the last lesson completes the course. Returns true the first time a course is completed.
 */
export function syncCourseCompletion(userId: string, courseId: string): boolean {
  enroll(userId, courseId, { silent: true });
  const e = getEnrollment(userId, courseId);
  if (!e || e.status === "COMPLETED") return false;

  const p = getUserProgressForCourse(userId, courseId);
  if (p.total === 0 || p.completed < p.total) return false;

  db.update(enrollments).set({ status: "COMPLETED", completedAt: new Date().toISOString() }).where(eq(enrollments.id, e.id)).run();
  const course = db.select().from(courses).where(eq(courses.id, courseId)).get();
  if (course) notify(userId, { type: "COURSE", title: `Course completed: ${course.title}`, body: "Well done! You finished every lesson.", url: `/dashboard/courses/${course.slug}`, email: true });
  return true;
}

/**
 * The student's courses with progress. Students who started lessons before enrolment existed are
 * enrolled automatically the first time this runs, so nothing they did is lost.
 */
export function listMyCourses(userId: string) {
  const done = db.select({ lessonId: progress.lessonId }).from(progress).where(and(eq(progress.userId, userId), eq(progress.completed, true))).all();
  for (const d of done) {
    const courseId = courseIdForLesson(d.lessonId);
    if (courseId && !getEnrollment(userId, courseId)) enroll(userId, courseId, { silent: true });
  }

  const rows = db
    .select({ enrollment: enrollments, course: courses })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(and(eq(enrollments.userId, userId), inArray(enrollments.status, ["ACTIVE", "COMPLETED"])))
    .all()
    .filter((r) => r.course.published);
  return rows
    .map((r) => ({ ...r, progress: getUserProgressForCourse(userId, r.course.id) }))
    .sort((a, b) => (b.enrollment.enrolledAt || "").localeCompare(a.enrollment.enrolledAt || ""));
}

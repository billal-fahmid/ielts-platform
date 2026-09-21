import { db } from "@/lib/db";
import { assignmentSubmissions, assignments, courses, enrollments, lessons, modules, profiles, quizAttempts, quizzes, users } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getUserProgressForCourse } from "@/lib/services/courses";
import { audienceIds, listTeacherAssignments } from "@/lib/services/assignments";
import { batchesOfStudent, isStudentOfTeacher, listBatches, studentIdsForTeacher } from "@/lib/services/teaching";
import { ownedCourseIds } from "@/lib/services/teacher-content";
import { scorePercent } from "@/lib/teaching/rules";
import { myReviews, queueCount } from "@/lib/services/writing-reviews";
import { upcomingSessionCount } from "@/lib/services/speaking-sessions";

const dayString = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
const avg = (nums: number[]) => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null);

function nameMap(ids: string[]) {
  if (!ids.length) return new Map<string, { name: string; email: string }>();
  return new Map(db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(inArray(users.id, ids)).all().map((u) => [u.id, { name: u.name, email: u.email }]));
}

/** Quiz ids of the lessons in the given courses. */
function lessonQuizIds(courseIds: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const courseId of courseIds) {
    const moduleIds = db.select({ id: modules.id }).from(modules).where(eq(modules.courseId, courseId)).all().map((m) => m.id);
    const lessonIds = moduleIds.length ? db.select({ id: lessons.id }).from(lessons).where(inArray(lessons.moduleId, moduleIds)).all().map((l) => l.id) : [];
    const quizIds = lessonIds.length ? db.select({ id: quizzes.id }).from(quizzes).where(inArray(quizzes.lessonId, lessonIds)).all().map((q) => q.id) : [];
    out.set(courseId, quizIds);
  }
  return out;
}

// ---------- Students ----------

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  batches: string[];
  courses: number;
  avgProgress: number | null;
  avgAssignmentScore: number | null;
  lastStudyDate: string | null;
};

export function teacherStudents(teacherId: string): StudentRow[] {
  const ids = studentIdsForTeacher(teacherId);
  if (!ids.length) return [];
  const names = nameMap(ids);
  const myCourses = ownedCourseIds(teacherId);
  const myAssignmentIds = db.select({ id: assignments.id }).from(assignments).where(eq(assignments.teacherId, teacherId)).all().map((a) => a.id);
  const maxByAssignment = new Map(db.select({ id: assignments.id, max: assignments.maxScore }).from(assignments).where(eq(assignments.teacherId, teacherId)).all().map((a) => [a.id, a.max]));

  return ids
    .filter((id) => names.has(id))
    .map((id) => {
      const enrolled = db.select().from(enrollments).where(eq(enrollments.userId, id)).all().filter((e) => e.status !== "DROPPED" && myCourses.includes(e.courseId));
      const progress = enrolled.map((e) => getUserProgressForCourse(id, e.courseId).percent);
      const graded = myAssignmentIds.length
        ? db.select().from(assignmentSubmissions).where(and(eq(assignmentSubmissions.studentId, id), inArray(assignmentSubmissions.assignmentId, myAssignmentIds))).all().filter((s) => s.status === "GRADED" && s.score != null)
        : [];
      return {
        id,
        name: names.get(id)!.name,
        email: names.get(id)!.email,
        batches: batchesOfStudent(teacherId, id).map((b) => b.name),
        courses: enrolled.length,
        avgProgress: avg(progress),
        avgAssignmentScore: avg(graded.map((s) => scorePercent(s.score!, maxByAssignment.get(s.assignmentId) ?? 100))),
        lastStudyDate: db.select().from(profiles).where(eq(profiles.userId, id)).get()?.lastStudyDate ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** One student's progress, but only for a student of this teacher; anyone else is null. */
export function teacherStudentDetail(teacherId: string, studentId: string) {
  if (!isStudentOfTeacher(teacherId, studentId)) return null;
  const user = db.select().from(users).where(eq(users.id, studentId)).get();
  if (!user) return null;
  const profile = db.select().from(profiles).where(eq(profiles.userId, studentId)).get() ?? null;
  const myCourses = db.select().from(courses).where(eq(courses.ownerId, teacherId)).all();
  const quizIdsByCourse = lessonQuizIds(myCourses.map((c) => c.id));

  const courseRows = myCourses
    .map((c) => {
      const e = db.select().from(enrollments).where(and(eq(enrollments.userId, studentId), eq(enrollments.courseId, c.id))).get();
      if (!e || e.status === "DROPPED") return null;
      const quizIds = quizIdsByCourse.get(c.id) ?? [];
      const attempts = quizIds.length ? db.select().from(quizAttempts).where(and(eq(quizAttempts.userId, studentId), inArray(quizAttempts.quizId, quizIds))).all() : [];
      return {
        courseId: c.id,
        title: c.title,
        status: e.status,
        ...getUserProgressForCourse(studentId, c.id),
        quizAverage: avg(attempts.filter((a) => a.totalQuestions > 0).map((a) => scorePercent(a.score, a.totalQuestions))),
        quizAttempts: attempts.length,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const assignmentRows = db
    .select()
    .from(assignments)
    .where(eq(assignments.teacherId, teacherId))
    .all()
    .filter((a) => audienceIds(a).includes(studentId))
    .map((a) => {
      const s = db.select().from(assignmentSubmissions).where(and(eq(assignmentSubmissions.assignmentId, a.id), eq(assignmentSubmissions.studentId, studentId))).get() ?? null;
      return { assignment: a, submission: s };
    });

  return { user: { id: user.id, name: user.name, email: user.email }, profile, batches: batchesOfStudent(teacherId, studentId), courses: courseRows, assignments: assignmentRows };
}

// ---------- Overview and analytics ----------

export function teacherOverview(teacherId: string) {
  const studentIds = studentIdsForTeacher(teacherId);
  const myCourses = db.select().from(courses).where(eq(courses.ownerId, teacherId)).all();
  const allAssignments = listTeacherAssignments(teacherId);
  const activeSince = dayString(-6);
  const activeStudents = studentIds.length
    ? db.select().from(profiles).where(inArray(profiles.userId, studentIds)).all().filter((p) => p.lastStudyDate && p.lastStudyDate >= activeSince).length
    : 0;
  const toGrade = allAssignments.reduce((n, a) => n + a.toGrade, 0);

  const myAssignmentIds = allAssignments.map((a) => a.id);
  const recent = myAssignmentIds.length
    ? db.select().from(assignmentSubmissions).where(and(inArray(assignmentSubmissions.assignmentId, myAssignmentIds), eq(assignmentSubmissions.status, "SUBMITTED"))).all().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 6)
    : [];
  const names = nameMap(recent.map((r) => r.studentId));
  const titles = new Map(allAssignments.map((a) => [a.id, a.title]));

  return {
    students: studentIds.length,
    activeStudents,
    courses: myCourses.length,
    publishedCourses: myCourses.filter((c) => c.published).length,
    batches: listBatches(teacherId).filter((b) => b.status === "ACTIVE").length,
    openAssignments: allAssignments.filter((a) => a.published).length,
    toGrade,
    reviewsWaiting: queueCount(),
    reviewsInProgress: myReviews(teacherId).filter((r) => r.status === "IN_REVIEW").length,
    upcomingSessions: upcomingSessionCount(teacherId),
    needsGrading: recent.map((r) => ({ submissionId: r.id, assignmentId: r.assignmentId, assignmentTitle: titles.get(r.assignmentId) ?? "Assignment", student: names.get(r.studentId)?.name ?? "Student", submittedAt: r.submittedAt })),
  };
}

export function teacherAnalytics(teacherId: string) {
  const myCourses = db.select().from(courses).where(eq(courses.ownerId, teacherId)).all();
  const quizIdsByCourse = lessonQuizIds(myCourses.map((c) => c.id));
  const monthAgo = dayString(-30);

  const courseRows = myCourses.map((c) => {
    const enr = db.select().from(enrollments).where(eq(enrollments.courseId, c.id)).all().filter((e) => e.status !== "DROPPED");
    const completed = enr.filter((e) => e.status === "COMPLETED").length;
    const quizIds = quizIdsByCourse.get(c.id) ?? [];
    const attempts = quizIds.length ? db.select().from(quizAttempts).where(inArray(quizAttempts.quizId, quizIds)).all().filter((a) => a.totalQuestions > 0) : [];
    return {
      id: c.id,
      title: c.title,
      published: c.published,
      enrolled: enr.length,
      completed,
      completionRate: enr.length ? Math.round((completed / enr.length) * 100) : null,
      newThisMonth: enr.filter((e) => e.enrolledAt.slice(0, 10) >= monthAgo).length,
      quizAverage: avg(attempts.map((a) => scorePercent(a.score, a.totalQuestions))),
      quizAttempts: attempts.length,
    };
  });

  const assignmentRows = listTeacherAssignments(teacherId)
    .filter((a) => a.published)
    .map((a) => {
      const graded = db.select().from(assignmentSubmissions).where(and(eq(assignmentSubmissions.assignmentId, a.id), eq(assignmentSubmissions.status, "GRADED"))).all().filter((s) => s.score != null);
      return { id: a.id, title: a.title, audience: a.audience, submitted: a.submitted, submissionRate: a.audience ? Math.round((a.submitted / a.audience) * 100) : null, graded: graded.length, averageScore: avg(graded.map((s) => scorePercent(s.score!, a.maxScore))) };
    });

  const students = teacherStudents(teacherId);
  const activeSince = dayString(-6);
  return {
    courses: courseRows,
    assignments: assignmentRows,
    totals: {
      students: students.length,
      activeThisWeek: students.filter((s) => s.lastStudyDate && s.lastStudyDate >= activeSince).length,
      inactive: students.filter((s) => !s.lastStudyDate || s.lastStudyDate < dayString(-13)).length,
    },
  };
}

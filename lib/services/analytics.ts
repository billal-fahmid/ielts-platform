import { db } from "@/lib/db";
import {
  aiTutorConversations,
  aiTutorMessages,
  assignmentSubmissions,
  courses,
  enrollments,
  ieltsAttempts,
  liveClasses,
  mockTestAttempts,
  progress,
  quizAttempts,
  speakingEvaluations,
  speakingSessions,
  speakingSlots,
  subscriptions,
  transactions,
  users,
  writingEvaluations,
  writingReviews,
  writingSubmissions,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { memo } from "@/lib/cache";
import { studentIdsForTeacher } from "@/lib/services/teaching";
import { ownedCourseIds } from "@/lib/services/teacher-content";
import { dayOf, lastDays, lastMonths, monthOf, pctChange, toMs, type Range } from "@/lib/analytics/rules";

const DAY = 86_400_000;

export type ActivityKind = "lesson" | "quiz" | "practice" | "writing" | "speaking" | "mock" | "ai";
type Ev = { userId: string; at: number; kind: ActivityKind };

/**
 * Every study action students have taken, from the records the platform already keeps: lessons finished, quizzes,
 * IELTS reading and listening, essays, speaking sessions, mock tests, and messages to the AI tutor.
 */
export function activityEvents(): Ev[] {
  const out: Ev[] = [];
  const add = (userId: string, ts: string | null, kind: ActivityKind) => {
    const at = toMs(ts);
    if (!Number.isNaN(at)) out.push({ userId, at, kind });
  };
  for (const r of db.select({ u: progress.userId, t: progress.completedAt }).from(progress).where(eq(progress.completed, true)).all()) add(r.u, r.t, "lesson");
  for (const r of db.select({ u: quizAttempts.userId, t: quizAttempts.createdAt }).from(quizAttempts).all()) add(r.u, r.t, "quiz");
  for (const r of db.select({ u: ieltsAttempts.userId, t: ieltsAttempts.completedAt, m: ieltsAttempts.mockAttemptId }).from(ieltsAttempts).where(eq(ieltsAttempts.status, "COMPLETED")).all()) if (!r.m) add(r.u, r.t, "practice");
  for (const r of db.select({ u: writingSubmissions.userId, t: writingSubmissions.submittedAt, s: writingSubmissions.status, m: writingSubmissions.mockAttemptId }).from(writingSubmissions).all()) if (r.s !== "DRAFT" && !r.m) add(r.u, r.t, "writing");
  for (const r of db.select({ u: speakingSessions.userId, t: speakingSessions.completedAt }).from(speakingSessions).where(eq(speakingSessions.status, "COMPLETED")).all()) add(r.u, r.t, "speaking");
  for (const r of db.select({ u: mockTestAttempts.userId, t: mockTestAttempts.completedAt }).from(mockTestAttempts).where(eq(mockTestAttempts.status, "COMPLETED")).all()) add(r.u, r.t, "mock");
  const convoUser = new Map(db.select({ id: aiTutorConversations.id, u: aiTutorConversations.userId }).from(aiTutorConversations).all().map((c) => [c.id, c.u]));
  for (const m of db.select({ c: aiTutorMessages.conversationId, t: aiTutorMessages.createdAt, r: aiTutorMessages.role }).from(aiTutorMessages).all()) {
    const u = convoUser.get(m.c);
    if (u && m.r === "USER") add(u, m.t, "ai");
  }
  return out;
}

export type Metric = { value: number; previous: number; change: number | null };
const metric = (value: number, previous: number): Metric => ({ value, previous, change: pctChange(value, previous) });

const inRange = (ts: string | null | undefined, from: number, to: number) => {
  const t = toMs(ts);
  return !Number.isNaN(t) && t >= from && t < to;
};

export type TeacherRow = { id: string; name: string; email: string; courses: number; students: number; classes: number; assignmentsGraded: number; writingReviews: number; speakingSessions: number };

/**
 * The admin dashboard numbers for the last `range` days, each compared with the `range` days before, plus daily and monthly
 * chart series and a table of teacher activity. Times are Bangladesh time. Results are cached for a minute.
 */
export function adminAnalytics(opts: { range: Range; now?: number; cache?: boolean }) {
  const now = opts.now ?? Date.now();
  const compute = () => build(opts.range, now);
  return opts.cache === false ? compute() : memo(`analytics:${opts.range}`, 60_000, compute, now);
}

function build(range: Range, now: number) {
  const to = now + 1; // include events at this exact moment
  const from = now - range * DAY;
  const prevFrom = from - range * DAY;

  const allUsers = db.select({ id: users.id, role: users.role, createdAt: users.createdAt }).from(users).all();
  const students = new Set(allUsers.filter((u) => u.role === "STUDENT").map((u) => u.id));
  const events = activityEvents().filter((e) => students.has(e.userId));
  const activeIn = (a: number, b: number) => new Set(events.filter((e) => e.at >= a && e.at < b).map((e) => e.userId)).size;

  const newUsers = (a: number, b: number) => allUsers.filter((u) => u.role === "STUDENT" && inRange(u.createdAt, a, b)).length;
  const enrolls = db.select({ at: enrollments.enrolledAt, courseId: enrollments.courseId, status: enrollments.status }).from(enrollments).all().filter((e) => e.status !== "DROPPED");
  const txs = db.select().from(transactions).all();
  const gross = (a: number, b: number) => txs.filter((t) => (t.status === "COMPLETED" || t.status === "REFUNDED") && inRange(t.verifiedAt ?? t.createdAt, a, b)).reduce((n, t) => n + t.amount, 0);
  const refunds = (a: number, b: number) => txs.filter((t) => t.status === "REFUNDED" && inRange(t.refundedAt, a, b)).reduce((n, t) => n + t.amount, 0);
  const net = (a: number, b: number) => gross(a, b) - refunds(a, b);

  const mocks = db.select({ at: mockTestAttempts.completedAt }).from(mockTestAttempts).where(eq(mockTestAttempts.status, "COMPLETED")).all();
  const essays = db.select({ at: writingSubmissions.submittedAt, s: writingSubmissions.status }).from(writingSubmissions).all().filter((w) => w.s !== "DRAFT");
  const speaking = db.select({ at: speakingSessions.completedAt }).from(speakingSessions).where(eq(speakingSessions.status, "COMPLETED")).all();
  const aiTimes = [
    ...db.select({ at: aiTutorConversations.createdAt }).from(aiTutorConversations).all(),
    ...db.select({ at: writingEvaluations.createdAt }).from(writingEvaluations).all(),
    ...db.select({ at: speakingEvaluations.createdAt }).from(speakingEvaluations).all(),
  ];
  const count = (rows: { at: string | null }[], a: number, b: number) => rows.filter((r) => inRange(r.at, a, b)).length;

  const now2 = now;
  const activeSubs = new Set(db.select().from(subscriptions).where(eq(subscriptions.status, "ACTIVE")).all().filter((s) => toMs(s.currentPeriodEnd) > now2 && students.has(s.userId)).map((s) => s.userId));

  const metrics = {
    totalUsers: { value: allUsers.length, students: allUsers.filter((u) => u.role === "STUDENT").length, teachers: allUsers.filter((u) => u.role === "TEACHER").length, admins: allUsers.filter((u) => u.role === "ADMIN").length },
    activeUsers: metric(activeIn(from, to), activeIn(prevFrom, from)),
    newUsers: metric(newUsers(from, to), newUsers(prevFrom, from)),
    premiumUsers: { value: activeSubs.size },
    enrollments: { ...metric(count(enrolls, from, to), count(enrolls, prevFrom, from)), total: enrolls.length },
    revenue: { ...metric(net(from, to), net(prevFrom, from)), gross: gross(from, to), refunds: refunds(from, to) },
    mockTests: metric(count(mocks, from, to), count(mocks, prevFrom, from)),
    aiSessions: metric(count(aiTimes, from, to), count(aiTimes, prevFrom, from)),
    writingSubmissions: metric(count(essays, from, to), count(essays, prevFrom, from)),
    speakingSessions: metric(count(speaking, from, to), count(speaking, prevFrom, from)),
  };

  // ----- daily series -----
  const days = lastDays(range, now);
  const idx = new Map(days.map((d, i) => [d, i]));
  const daily = days.map((day) => ({ day, newUsers: 0, activeUsers: 0, revenue: 0, enrollments: 0, lesson: 0, quiz: 0, practice: 0, writing: 0, speaking: 0, mock: 0, ai: 0 }));
  const activeByDay = days.map(() => new Set<string>());
  for (const u of allUsers) if (u.role === "STUDENT") { const i = idx.get(dayOf(toMs(u.createdAt))); if (i !== undefined) daily[i].newUsers++; }
  for (const e of events) {
    const i = idx.get(dayOf(e.at));
    if (i === undefined) continue;
    daily[i][e.kind]++;
    activeByDay[i].add(e.userId);
  }
  daily.forEach((d, i) => (d.activeUsers = activeByDay[i].size));
  for (const t of txs) {
    if (t.status !== "COMPLETED" && t.status !== "REFUNDED") continue;
    const i = idx.get(dayOf(toMs(t.verifiedAt ?? t.createdAt)));
    if (i !== undefined) daily[i].revenue += t.amount;
  }
  for (const t of txs) if (t.status === "REFUNDED") { const i = idx.get(dayOf(toMs(t.refundedAt))); if (i !== undefined) daily[i].revenue -= t.amount; }
  for (const e of enrolls) { const i = idx.get(dayOf(toMs(e.at))); if (i !== undefined) daily[i].enrollments++; }

  // ----- monthly series -----
  const months = lastMonths(12, now);
  const midx = new Map(months.map((m, i) => [m, i]));
  const monthly = months.map((month) => ({ month, newUsers: 0, activeUsers: 0, revenue: 0, enrollments: 0 }));
  const activeByMonth = months.map(() => new Set<string>());
  for (const u of allUsers) if (u.role === "STUDENT") { const i = midx.get(monthOf(toMs(u.createdAt))); if (i !== undefined) monthly[i].newUsers++; }
  for (const e of events) { const i = midx.get(monthOf(e.at)); if (i !== undefined) activeByMonth[i].add(e.userId); }
  monthly.forEach((m, i) => (m.activeUsers = activeByMonth[i].size));
  for (const t of txs) {
    if (t.status === "COMPLETED" || t.status === "REFUNDED") { const i = midx.get(monthOf(toMs(t.verifiedAt ?? t.createdAt))); if (i !== undefined) monthly[i].revenue += t.amount; }
    if (t.status === "REFUNDED") { const i = midx.get(monthOf(toMs(t.refundedAt))); if (i !== undefined) monthly[i].revenue -= t.amount; }
  }
  for (const e of enrolls) { const i = midx.get(monthOf(toMs(e.at))); if (i !== undefined) monthly[i].enrollments++; }

  // ----- top courses by enrolments in the period -----
  const titles = new Map(db.select({ id: courses.id, title: courses.title }).from(courses).all().map((c) => [c.id, c.title]));
  const perCourse = new Map<string, number>();
  for (const e of enrolls) if (inRange(e.at, from, to)) perCourse.set(e.courseId, (perCourse.get(e.courseId) ?? 0) + 1);
  const topCourses = [...perCourse.entries()].map(([id, n]) => ({ course: titles.get(id) ?? "Removed course", enrollments: n })).sort((a, b) => b.enrollments - a.enrollments || a.course.localeCompare(b.course)).slice(0, 8);

  return { range, from, to: now, metrics, daily, monthly, topCourses, teachers: teacherActivity(from, to) };
}

/** What each teacher did in the period: classes held, work graded, reviews and speaking sessions completed. */
function teacherActivity(from: number, to: number): TeacherRow[] {
  const teachers = db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.role, "TEACHER")).all();
  const classes = db.select().from(liveClasses).where(eq(liveClasses.status, "SCHEDULED")).all();
  const graded = db.select({ by: assignmentSubmissions.gradedBy, at: assignmentSubmissions.gradedAt }).from(assignmentSubmissions).where(eq(assignmentSubmissions.status, "GRADED")).all();
  const reviews = db.select({ by: writingReviews.teacherId, at: writingReviews.completedAt, s: writingReviews.status }).from(writingReviews).all();
  const slots = db.select({ by: speakingSlots.teacherId, at: speakingSlots.completedAt, s: speakingSlots.status }).from(speakingSlots).all();
  return teachers
    .map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      courses: ownedCourseIds(t.id).length,
      students: studentIdsForTeacher(t.id).length,
      // A class counts as held once its start time has passed inside the period.
      classes: classes.filter((c) => c.teacherId === t.id && inRange(c.startsAt, from, to) && toMs(c.startsAt) <= to).length,
      assignmentsGraded: graded.filter((g) => g.by === t.id && inRange(g.at, from, to)).length,
      writingReviews: reviews.filter((r) => r.by === t.id && r.s === "COMPLETED" && inRange(r.at, from, to)).length,
      speakingSessions: slots.filter((s) => s.by === t.id && s.s === "COMPLETED" && inRange(s.at, from, to)).length,
    }))
    .sort((a, b) => b.assignmentsGraded + b.writingReviews + b.speakingSessions + b.classes - (a.assignmentsGraded + a.writingReviews + a.speakingSessions + a.classes) || a.name.localeCompare(b.name));
}

export type Analytics = ReturnType<typeof adminAnalytics>;

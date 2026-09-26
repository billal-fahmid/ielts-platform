import { db } from "@/lib/db";
import { challengeCompletions, ieltsAttempts, mockTestAttempts, profiles, progress, quizAttempts, speakingSessions, users, writingSubmissions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { awardXp } from "@/lib/services/gamification";
import { notify } from "@/lib/services/notifications";
import { TeachingError } from "@/lib/services/teaching";
import { challengeKey, CHALLENGES, dhakaDay, emptyCounts, leaderboardLabel, metricValue, periodBounds, pointsOf, type ActivityCounts, type Period, type PeriodKind, type Visibility } from "@/lib/growth/rules";

const toMs = (ts: string) => new Date(/[TZ]/.test(ts) ? ts : ts.replace(" ", "T") + "Z").getTime();

/**
 * Study activity per student between two moments (or all time, with no period): lessons finished, quizzes, IELTS practice,
 * essays, speaking sessions, mock tests, and the number of different days they studied. Nothing here is a separate log:
 * it is counted from the records the rest of the platform already keeps.
 */
export function collectActivity(period: Period | null): Map<string, ActivityCounts> {
  const from = period ? period.start.getTime() : -Infinity;
  const to = period ? period.end.getTime() : Infinity;
  const out = new Map<string, ActivityCounts>();
  const days = new Map<string, Set<string>>();
  const add = (userId: string, ts: string | null, field: keyof Omit<ActivityCounts, "days">) => {
    if (!ts) return;
    const t = toMs(ts);
    if (Number.isNaN(t) || t < from || t >= to) return;
    const c = out.get(userId) ?? emptyCounts();
    c[field]++;
    out.set(userId, c);
    const d = days.get(userId) ?? new Set<string>();
    d.add(dhakaDay(new Date(t)));
    days.set(userId, d);
  };

  for (const r of db.select({ u: progress.userId, t: progress.completedAt }).from(progress).where(eq(progress.completed, true)).all()) add(r.u, r.t, "lessons");
  for (const r of db.select({ u: quizAttempts.userId, t: quizAttempts.createdAt }).from(quizAttempts).all()) add(r.u, r.t, "quizzes");
  for (const r of db.select({ u: ieltsAttempts.userId, t: ieltsAttempts.completedAt, m: ieltsAttempts.mockAttemptId }).from(ieltsAttempts).where(eq(ieltsAttempts.status, "COMPLETED")).all()) if (!r.m) add(r.u, r.t, "practice");
  for (const r of db.select({ u: writingSubmissions.userId, t: writingSubmissions.submittedAt, s: writingSubmissions.status, m: writingSubmissions.mockAttemptId }).from(writingSubmissions).all()) if (r.s !== "DRAFT" && !r.m) add(r.u, r.t, "writing");
  for (const r of db.select({ u: speakingSessions.userId, t: speakingSessions.completedAt }).from(speakingSessions).where(eq(speakingSessions.status, "COMPLETED")).all()) add(r.u, r.t, "speaking");
  for (const r of db.select({ u: mockTestAttempts.userId, t: mockTestAttempts.completedAt }).from(mockTestAttempts).where(eq(mockTestAttempts.status, "COMPLETED")).all()) add(r.u, r.t, "mocks");
  for (const [u, set] of days) {
    const c = out.get(u);
    if (c) c.days = set.size;
  }
  return out;
}

// ---------- Challenges ----------

export type ChallengeProgress = { id: string; key: string; title: string; description: string; period: Period; value: number; target: number; done: boolean; rewardXp: number };

/** How far a student is on every current weekly and monthly challenge. */
export function challengeProgress(userId: string, now = new Date()): ChallengeProgress[] {
  const periods: Record<PeriodKind, Period> = { WEEK: periodBounds("WEEK", now), MONTH: periodBounds("MONTH", now) };
  const counts = { WEEK: collectActivity(periods.WEEK).get(userId) ?? emptyCounts(), MONTH: collectActivity(periods.MONTH).get(userId) ?? emptyCounts() };
  const done = new Set(db.select().from(challengeCompletions).where(eq(challengeCompletions.userId, userId)).all().map((c) => c.challengeKey));
  return CHALLENGES.map((d) => {
    const period = periods[d.period];
    const key = challengeKey(period, d.id);
    const value = metricValue(d.metric, counts[d.period]);
    return { id: d.id, key, title: d.title, description: d.description, period, value: Math.min(value, d.target), target: d.target, done: done.has(key) || value >= d.target, rewardXp: d.rewardXp };
  });
}

/** Records challenges the student has just finished, gives the XP and tells them. Each challenge pays out once per period. */
export function completeChallenges(userId: string, now = new Date()): ChallengeProgress[] {
  const newly: ChallengeProgress[] = [];
  const already = new Set(db.select().from(challengeCompletions).where(eq(challengeCompletions.userId, userId)).all().map((c) => c.challengeKey));
  for (const c of challengeProgress(userId, now)) {
    if (!c.done || already.has(c.key)) continue;
    const res = db.insert(challengeCompletions).values({ id: newId(), userId, challengeKey: c.key, rewardXp: c.rewardXp }).onConflictDoNothing().run();
    if (res.changes !== 1) continue; // another request paid it out first
    void awardXp(userId, c.rewardXp);
    notify(userId, { type: "ACHIEVEMENT", title: `Challenge complete: ${c.title}`, body: `+${c.rewardXp} XP. ${c.description}`, url: "/dashboard/challenges" });
    newly.push(c);
  }
  return newly;
}

// ---------- Leaderboards ----------

export type LeaderboardScope = "WEEK" | "MONTH" | "ALL";
export type LeaderboardRow = { rank: number; label: string; points: number; isYou: boolean };

/**
 * The public leaderboard for a period. Students choose how they appear (anonymous by default, first name and initial,
 * or hidden). Ranks count only people who are listed; a student who hides still sees where they would stand.
 */
export function leaderboard(viewerId: string, scope: LeaderboardScope, now = new Date(), limit = 20) {
  const period = scope === "ALL" ? null : periodBounds(scope, now);
  const activity = collectActivity(period);
  const people = new Map(
    db
      .select({ id: users.id, name: users.name, role: users.role, vis: profiles.leaderboardVisibility })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.role, "STUDENT"))
      .all()
      .map((u) => [u.id, u])
  );
  const scored = [...activity.entries()]
    .map(([id, c]) => ({ id, points: pointsOf(c), person: people.get(id) }))
    .filter((r) => r.person && r.points > 0)
    .sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));

  const listed = scored.filter((r) => (r.person!.vis ?? "ANONYMOUS") !== "HIDDEN");
  // Same points, same rank.
  const rankOf = (points: number) => listed.filter((r) => r.points > points).length + 1;
  const rows: LeaderboardRow[] = listed.slice(0, limit).map((r) => ({ rank: rankOf(r.points), label: leaderboardLabel((r.person!.vis ?? "ANONYMOUS") as Visibility, r.person!.name, r.id)!, points: r.points, isYou: r.id === viewerId }));
  const mine = scored.find((r) => r.id === viewerId);
  const visibility = ((people.get(viewerId)?.vis ?? "ANONYMOUS") as Visibility);
  return {
    scope,
    label: period ? period.label : "All time",
    rows,
    participants: listed.length,
    you: mine ? { rank: rankOf(mine.points), points: mine.points, listed: visibility !== "HIDDEN" } : null,
    visibility,
  };
}

export function setLeaderboardVisibility(userId: string, visibility: string) {
  if (!["ANONYMOUS", "NAME", "HIDDEN"].includes(visibility)) throw new TeachingError("Choose how you want to appear.");
  const res = db.update(profiles).set({ leaderboardVisibility: visibility as Visibility }).where(eq(profiles.userId, userId)).run();
  if (res.changes !== 1) throw new TeachingError("Finish setting up your profile first.", 400);
}

export const completedChallengeCount = (userId: string) => db.select().from(challengeCompletions).where(eq(challengeCompletions.userId, userId)).all().length;

void and;

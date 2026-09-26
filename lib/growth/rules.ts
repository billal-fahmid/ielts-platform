/** Client-safe rules for referrals, challenges, leaderboards and certificates (no database). */

import { displayName } from "@/lib/community/rules";

// ---------- Referrals ----------

/** Letters and digits without the look-alikes (no 0/O, 1/I), so codes are easy to read out and type. */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REFERRAL_CODE_LENGTH = 8;
/** Days of plan the referrer gets when a friend they referred makes their first paid purchase. */
export const REFERRAL_REWARD_DAYS = 7;
/** A referrer can earn this many rewards in total, so a reward can't be farmed forever. */
export const REFERRAL_MAX_REWARDS = 12;
export const REFERRAL_COOKIE = "ref";
export const REFERRAL_COOKIE_DAYS = 30;

/** Turns what someone typed or a link contained into a code, or null if it can't be one. */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  const c = (raw ?? "").toUpperCase().replace(/[\s-]+/g, "");
  return new RegExp(`^[${CODE_ALPHABET}]{${REFERRAL_CODE_LENGTH}}$`).test(c) ? c : null;
}

// ---------- Certificates ----------

/** "CERT-ABCDE-FGHJK": 10 characters from a 32-letter alphabet, about 50 bits, so codes can't be guessed. */
export function formatCertificateCode(ten: string): string {
  return `CERT-${ten.slice(0, 5)}-${ten.slice(5, 10)}`;
}

/** Accepts "cert-abcde-fghjk", "CERTABCDEFGHJK" and similar; returns the canonical code, or null. */
export function normalizeCertificateCode(raw: string | null | undefined): string | null {
  const c = (raw ?? "").toUpperCase().replace(/[\s-]+/g, "");
  const m = new RegExp(`^CERT([${CODE_ALPHABET}]{10})$`).exec(c);
  return m ? formatCertificateCode(m[1]) : null;
}

// ---------- Periods (Bangladesh time) ----------

export type PeriodKind = "WEEK" | "MONTH";
export type Period = { kind: PeriodKind; key: string; label: string; start: Date; end: Date };

const DHAKA_OFFSET = 6 * 3_600_000;
const DAY = 86_400_000;

/** The instant when a Dhaka calendar day starts, given that day as UTC-midnight of the same date. */
const dhakaMidnight = (utcMidnightOfDate: number) => new Date(utcMidnightOfDate - DHAKA_OFFSET);

function isoWeek(localMonday: Date): { year: number; week: number } {
  // The ISO week belongs to the year of its Thursday.
  const thursday = new Date(localMonday.getTime() + 3 * DAY);
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.floor((thursday.getTime() - jan1) / DAY / 7) + 1;
  return { year, week };
}

/** The current week (Monday to Sunday) or calendar month in Bangladesh time. */
export function periodBounds(kind: PeriodKind, now: Date = new Date()): Period {
  const local = new Date(now.getTime() + DHAKA_OFFSET); // read with UTC getters to get Dhaka's clock
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  if (kind === "WEEK") {
    const sinceMonday = (local.getUTCDay() + 6) % 7;
    const mondayLocal = midnight - sinceMonday * DAY;
    const { year, week } = isoWeek(new Date(mondayLocal));
    const label = `${new Date(mondayLocal).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })} – ${new Date(mondayLocal + 6 * DAY).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`;
    return { kind, key: `W${year}-${String(week).padStart(2, "0")}`, label, start: dhakaMidnight(mondayLocal), end: dhakaMidnight(mondayLocal + 7 * DAY) };
  }
  const first = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1);
  const next = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1);
  const label = new Date(first).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return { kind, key: `M${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`, label, start: dhakaMidnight(first), end: dhakaMidnight(next) };
}

/** The Dhaka calendar day ("2026-09-26") an instant falls on. */
export const dhakaDay = (d: Date) => new Date(d.getTime() + DHAKA_OFFSET).toISOString().slice(0, 10);

// ---------- Activity, points and challenges ----------

/** What each kind of study is worth on the leaderboard. */
export const ACTIVITY_POINTS = { lesson: 10, quiz: 5, practice: 8, writing: 12, speaking: 12, mock: 30 } as const;

export type ActivityCounts = { lessons: number; quizzes: number; practice: number; writing: number; speaking: number; mocks: number; days: number };
export const emptyCounts = (): ActivityCounts => ({ lessons: 0, quizzes: 0, practice: 0, writing: 0, speaking: 0, mocks: 0, days: 0 });

export const pointsOf = (c: ActivityCounts) => c.lessons * ACTIVITY_POINTS.lesson + c.quizzes * ACTIVITY_POINTS.quiz + c.practice * ACTIVITY_POINTS.practice + c.writing * ACTIVITY_POINTS.writing + c.speaking * ACTIVITY_POINTS.speaking + c.mocks * ACTIVITY_POINTS.mock;

export type ChallengeMetric = "LESSONS" | "QUIZZES" | "IELTS" | "POINTS" | "DAYS" | "MOCKS";
export type ChallengeDef = { id: string; period: PeriodKind; title: string; description: string; metric: ChallengeMetric; target: number; rewardXp: number };

export const CHALLENGES: ChallengeDef[] = [
  { id: "LESSONS", period: "WEEK", title: "Lesson streak", description: "Complete 5 lessons this week.", metric: "LESSONS", target: 5, rewardXp: 50 },
  { id: "QUIZZES", period: "WEEK", title: "Quiz master", description: "Take 5 quizzes this week.", metric: "QUIZZES", target: 5, rewardXp: 30 },
  { id: "IELTS", period: "WEEK", title: "IELTS practice", description: "Do 3 IELTS practice activities (reading, listening, writing or speaking).", metric: "IELTS", target: 3, rewardXp: 60 },
  { id: "DAYS", period: "WEEK", title: "Show up", description: "Study on 5 different days this week.", metric: "DAYS", target: 5, rewardXp: 50 },
  { id: "POINTS", period: "MONTH", title: "Point collector", description: "Earn 500 points this month.", metric: "POINTS", target: 500, rewardXp: 150 },
  { id: "LESSONS", period: "MONTH", title: "Lesson marathon", description: "Complete 20 lessons this month.", metric: "LESSONS", target: 20, rewardXp: 150 },
  { id: "MOCKS", period: "MONTH", title: "Test day", description: "Finish a full IELTS mock test this month.", metric: "MOCKS", target: 1, rewardXp: 100 },
];

export function metricValue(metric: ChallengeMetric, c: ActivityCounts): number {
  switch (metric) {
    case "LESSONS":
      return c.lessons;
    case "QUIZZES":
      return c.quizzes;
    case "IELTS":
      return c.practice + c.writing + c.speaking;
    case "POINTS":
      return pointsOf(c);
    case "DAYS":
      return c.days;
    case "MOCKS":
      return c.mocks;
  }
}

export const challengeKey = (period: Period, challengeId: string) => `${period.key}:${challengeId}`;

// ---------- Leaderboards ----------

export type Visibility = "ANONYMOUS" | "NAME" | "HIDDEN";
export const VISIBILITY_LABELS: Record<Visibility, { title: string; hint: string }> = {
  ANONYMOUS: { title: "Anonymous", hint: "You appear as “Learner ab12”. Nobody can tell it's you." },
  NAME: { title: "First name and initial", hint: "You appear as, for example, “Rafiq I.”." },
  HIDDEN: { title: "Hidden", hint: "You don't appear on the public list. You still see your own rank." },
};

/** A short stable code from a user id, so an anonymous learner keeps the same label. */
export function anonymousTag(userId: string): string {
  let h = 5381;
  for (let i = 0; i < userId.length; i++) h = ((h << 5) + h + userId.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(4, "0").slice(-4);
}

/** How someone is shown on a public leaderboard, or null when they chose to be hidden. */
export function leaderboardLabel(visibility: Visibility, name: string, userId: string): string | null {
  if (visibility === "HIDDEN") return null;
  if (visibility === "NAME") return displayName(name, "STUDENT");
  return `Learner ${anonymousTag(userId)}`;
}

/**
 * Turns a flag emoji into its two-letter country code ("🇨🇦" becomes "CA"). Windows can't draw flag emoji (it shows the
 * letters), so pages show a country-code badge that looks the same on every device.
 */
export function flagCode(flag: string | null | undefined): string {
  const letters = [...(flag ?? "")].map((ch) => ch.codePointAt(0) ?? 0).filter((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff).map((cp) => String.fromCharCode(cp - 0x1f1e6 + 65));
  return letters.length === 2 ? letters.join("") : "";
}

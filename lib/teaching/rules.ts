/** Client-safe assignment rules (no database), so they can be unit-tested and shared by pages. */

export type StudentAssignmentStatus = "TODO" | "SUBMITTED" | "GRADED" | "OVERDUE";

export const STATUS_LABELS: Record<StudentAssignmentStatus, string> = {
  TODO: "To do",
  SUBMITTED: "Submitted",
  GRADED: "Graded",
  OVERDUE: "Overdue",
};

/** Due dates are whole days in Bangladesh time: an assignment due 2026-10-05 stays open until the end of that day in Dhaka. */
export function dueDeadline(dueAt: string | null | undefined): Date | null {
  if (!dueAt || !/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) return null;
  const d = new Date(`${dueAt}T23:59:59+06:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isPastDue(dueAt: string | null | undefined, now: Date = new Date()): boolean {
  const deadline = dueDeadline(dueAt);
  return !!deadline && now.getTime() > deadline.getTime();
}

/** Where a student stands on an assignment. Work handed in after the deadline still counts as submitted. */
export function studentStatus(assignment: { dueAt: string | null }, submission: { status: "SUBMITTED" | "GRADED" } | null | undefined, now: Date = new Date()): StudentAssignmentStatus {
  if (submission) return submission.status === "GRADED" ? "GRADED" : "SUBMITTED";
  return isPastDue(assignment.dueAt, now) ? "OVERDUE" : "TODO";
}

/** A score for grading: a whole number from 0 to the assignment's maximum. Returns an error message, or null when fine. */
export function scoreProblem(score: unknown, maxScore: number): string | null {
  if (typeof score !== "number" || !Number.isInteger(score)) return "Enter the score as a whole number.";
  if (score < 0 || score > maxScore) return `The score must be between 0 and ${maxScore}.`;
  return null;
}

export const scorePercent = (score: number, maxScore: number) => (maxScore > 0 ? Math.round((score / maxScore) * 100) : 0);

/** Links a student may attach: web addresses only, never script or file links. */
export function isWebLink(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export const MAX_ANSWER_LENGTH = 20000;

/** "5 Oct 2026" for a whole-day date like 2026-10-05. */
export function formatDay(day: string | null | undefined): string {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return "—";
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** "5 Oct 2026, 14:30" (Bangladesh time) for a database timestamp, which is UTC either as ISO or as "YYYY-MM-DD HH:MM:SS". */
export function formatWhen(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(/[TZ]/.test(ts) ? ts : ts.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });
}

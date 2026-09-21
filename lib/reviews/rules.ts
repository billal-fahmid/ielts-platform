/** Client-safe rules for human writing reviews and one-to-one speaking sessions (no database). */

export const MAX_OPEN_REVIEWS = 3;
export const MAX_ACTIVE_BOOKINGS = 2;
export const MAX_FUTURE_SLOTS = 200;
export const MAX_FEEDBACK_CHARS = 5000;

/** Bookings must be made at least this long before the start, and can be cancelled by the student until then. */
export const BOOKING_LEAD_MINUTES = 120;
export const CANCEL_CUTOFF_MINUTES = 120;
/** A teacher can start a session this early, and mark a no-show this long after the start. */
export const START_EARLY_MINUTES = 10;
export const NO_SHOW_AFTER_MINUTES = 10;
/** A new slot must start at least this far ahead. */
export const SLOT_MIN_LEAD_MINUTES = 30;

export const SLOT_DURATIONS = [15, 20, 30, 45] as const;

const MINUTE = 60_000;

// ---------- Bands ----------

/** An IELTS-style band: 0 to 9 in steps of 0.5. */
export function isValidBand(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 9 && Number.isInteger(n * 2);
}

export const BAND_PROBLEM = "Bands go from 0 to 9 in steps of 0.5 (for example 6.5).";

/**
 * A suggested overall band from criterion bands: their average, rounded to the nearest half band, with
 * .25 rounding up to .5 and .75 up to the next whole band (the way IELTS rounds). The teacher can change it.
 */
export function suggestOverallBand(criteria: number[]): number | null {
  if (criteria.length === 0 || criteria.some((c) => !isValidBand(c))) return null;
  const avg = criteria.reduce((a, b) => a + b, 0) / criteria.length;
  return Math.round(avg * 2) / 2;
}

// ---------- Bangladesh time ----------

/** Converts what a teacher types in a "datetime-local" box (Bangladesh time, "2026-10-05T18:30") to a UTC ISO string. */
export function dhakaLocalToUtcIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00+06:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** The reverse, for filling a "datetime-local" box. */
export function utcIsoToDhakaLocal(iso: string): string {
  return new Date(new Date(iso).getTime() + 6 * 3_600_000).toISOString().slice(0, 16);
}

/** "Mon 5 Oct, 6:30 pm" in Bangladesh time. */
export function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Dhaka" });
}

// ---------- Speaking slots ----------

export type SlotTimes = { startsAt: string; durationMinutes: number };
export type SlotStatus = "OPEN" | "BOOKED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export const slotStart = (s: SlotTimes) => new Date(s.startsAt).getTime();
export const slotEnd = (s: SlotTimes) => slotStart(s) + s.durationMinutes * MINUTE;

/** Two slots overlap when each starts before the other ends. Back-to-back slots don't overlap. */
export const slotsOverlap = (a: SlotTimes, b: SlotTimes) => slotStart(a) < slotEnd(b) && slotStart(b) < slotEnd(a);

/** Slots in these states still take up the teacher's time. */
export const ACTIVE_SLOT_STATUSES: SlotStatus[] = ["OPEN", "BOOKED", "IN_PROGRESS", "COMPLETED"];

export function canBook(slot: SlotTimes & { status: SlotStatus }, now: Date = new Date()): boolean {
  return slot.status === "OPEN" && slotStart(slot) - now.getTime() >= BOOKING_LEAD_MINUTES * MINUTE;
}

export function canStudentCancel(slot: SlotTimes & { status: SlotStatus }, now: Date = new Date()): boolean {
  return slot.status === "BOOKED" && slotStart(slot) - now.getTime() >= CANCEL_CUTOFF_MINUTES * MINUTE;
}

export function canStart(slot: SlotTimes & { status: SlotStatus }, now: Date = new Date()): boolean {
  const t = now.getTime();
  return slot.status === "BOOKED" && t >= slotStart(slot) - START_EARLY_MINUTES * MINUTE && t < slotEnd(slot);
}

export function canMarkNoShow(slot: SlotTimes & { status: SlotStatus }, now: Date = new Date()): boolean {
  return slot.status === "BOOKED" && now.getTime() >= slotStart(slot) + NO_SHOW_AFTER_MINUTES * MINUTE;
}

export const SLOT_STATUS_LABELS: Record<SlotStatus, string> = {
  OPEN: "Open",
  BOOKED: "Booked",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "Student didn't attend",
};

export type ReviewStatus = "REQUESTED" | "IN_REVIEW" | "COMPLETED" | "CANCELLED";

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  REQUESTED: "Waiting for a teacher",
  IN_REVIEW: "A teacher is reviewing",
  COMPLETED: "Reviewed",
  CANCELLED: "Cancelled",
};

/** 0, 0.5, ... 9: the choices for a band dropdown. */
export const BAND_OPTIONS: number[] = Array.from({ length: 19 }, (_, i) => i / 2);

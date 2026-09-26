/** Client-safe rules for live classes (no database). Times are UTC ISO strings; people see Bangladesh time. */

export const CLASS_DURATIONS = [30, 45, 60, 90, 120] as const;
export const MAX_CLASS_TITLE = 120;

/** Students can join from this long before the start until this long after the end. */
export const JOIN_EARLY_MINUTES = 10;
export const JOIN_LATE_MINUTES = 30;
/** Joining more than this long after the start counts as late. */
export const LATE_AFTER_MINUTES = 10;
/** A class must be scheduled at least this far ahead. */
export const CLASS_MIN_LEAD_MINUTES = 15;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export type ClassTimes = { startsAt: string; durationMinutes: number };
export type ClassState = "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
export type ClassLike = ClassTimes & { status: "SCHEDULED" | "CANCELLED" };

export const classStart = (c: ClassTimes) => new Date(c.startsAt).getTime();
export const classEnd = (c: ClassTimes) => classStart(c) + c.durationMinutes * MINUTE;

/** Whether the class hasn't started, is running now, or is over. Cancelled classes are just cancelled. */
export function classState(c: ClassLike, now: Date = new Date()): ClassState {
  if (c.status === "CANCELLED") return "CANCELLED";
  const t = now.getTime();
  if (t < classStart(c)) return "UPCOMING";
  return t < classEnd(c) ? "LIVE" : "FINISHED";
}

/** The Join button works from 10 minutes before the start until 30 minutes after the end. */
export function canJoin(c: ClassLike, now: Date = new Date()): boolean {
  if (c.status !== "SCHEDULED") return false;
  const t = now.getTime();
  return t >= classStart(c) - JOIN_EARLY_MINUTES * MINUTE && t < classEnd(c) + JOIN_LATE_MINUTES * MINUTE;
}

/** A student who joins after the first 10 minutes is marked late. */
export const attendanceOnJoin = (c: ClassTimes, now: Date = new Date()): "PRESENT" | "LATE" => (now.getTime() > classStart(c) + LATE_AFTER_MINUTES * MINUTE ? "LATE" : "PRESENT");

export const classesOverlap = (a: ClassTimes, b: ClassTimes) => classStart(a) < classEnd(b) && classStart(b) < classEnd(a);

/**
 * Which reminders to send now: one about a day ahead and one about an hour ahead. A reminder is skipped once it
 * has gone out, and one whose moment has already passed when the class was made (a class set up 3 hours ahead
 * gets no "tomorrow" reminder).
 */
export function dueReminders(c: ClassLike & { dayReminderSentAt: string | null; hourReminderSentAt: string | null }, now: Date = new Date()): ("DAY" | "HOUR")[] {
  if (c.status !== "SCHEDULED") return [];
  const untilStart = classStart(c) - now.getTime();
  if (untilStart <= 0) return [];
  const due: ("DAY" | "HOUR")[] = [];
  if (!c.hourReminderSentAt && untilStart <= HOUR) due.push("HOUR");
  else if (!c.dayReminderSentAt && untilStart <= 24 * HOUR && untilStart > HOUR) due.push("DAY");
  return due;
}

/** For a class just made or moved: mark reminders whose time has already passed as sent, so they don't fire at once. */
export function initialReminderMarks(c: ClassTimes, now: Date = new Date()): { dayReminderSentAt: string | null; hourReminderSentAt: string | null } {
  const untilStart = classStart(c) - now.getTime();
  const stamp = now.toISOString();
  return { dayReminderSentAt: untilStart <= 24 * HOUR ? stamp : null, hourReminderSentAt: untilStart <= HOUR ? stamp : null };
}

export const CLASS_STATE_LABELS: Record<ClassState, string> = { UPCOMING: "Upcoming", LIVE: "Live now", FINISHED: "Finished", CANCELLED: "Cancelled" };
export const ATTENDANCE_LABELS = { PRESENT: "Present", LATE: "Late", ABSENT: "Absent" } as const;
export type AttendanceStatus = keyof typeof ATTENDANCE_LABELS;

/** Client-safe helpers for the admin analytics: Bangladesh-time buckets, period comparison and safe CSV. */

const DHAKA_OFFSET = 6 * 3_600_000;
const DAY = 86_400_000;

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const parseRange = (v: unknown): Range => (RANGES as readonly number[]).includes(Number(v)) ? (Number(v) as Range) : 30;

/** A database timestamp (ISO or "YYYY-MM-DD HH:MM:SS", both UTC) as milliseconds. NaN if it isn't one. */
export const toMs = (ts: string | null | undefined): number => (ts ? new Date(/[TZ]/.test(ts) ? ts : ts.replace(" ", "T") + "Z").getTime() : NaN);

/** The Dhaka calendar day ("2026-09-26") an instant falls on. */
export const dayOf = (ms: number): string => new Date(ms + DHAKA_OFFSET).toISOString().slice(0, 10);
export const monthOf = (ms: number): string => dayOf(ms).slice(0, 7);

/** The last `count` Dhaka days ending with today, oldest first. */
export function lastDays(count: number, now: number): string[] {
  return Array.from({ length: count }, (_, i) => dayOf(now - (count - 1 - i) * DAY));
}

/** The last `count` Dhaka calendar months ending with this one, oldest first ("2026-09"). */
export function lastMonths(count: number, now: number): string[] {
  const local = new Date(now + DHAKA_OFFSET);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

/** The first instant (UTC ms) of a Dhaka day. */
export const dayStart = (day: string): number => new Date(`${day}T00:00:00+06:00`).getTime();

/** Percent change from the previous period to the current one, rounded. Null when there is nothing to compare with. */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** "Sep 26" for a day key, and "Sep 2026" for a month key, for chart axes. */
export function shortDay(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
export function shortMonth(month: string): string {
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
}

/**
 * One CSV cell. Quotes and commas are escaped, and a value starting with = + - @ (or a tab or return) gets a leading
 * apostrophe so a spreadsheet can't run it as a formula: names and titles come from users and must not be trusted.
 */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

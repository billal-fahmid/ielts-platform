/** Client-safe rules for the community and speaking rooms (no database). */

export const POST_KINDS = ["DISCUSSION", "QUESTION"] as const;
export type PostKind = (typeof POST_KINDS)[number];
export const KIND_LABELS: Record<PostKind, string> = { DISCUSSION: "Discussion", QUESTION: "Question" };

export const TITLE_MIN = 8;
export const TITLE_MAX = 140;
export const POST_BODY_MIN = 10;
export const POST_BODY_MAX = 8000;
export const COMMENT_MAX = 4000;
export const MAX_TAGS = 5;
export const TAG_MAX = 24;

/** This many different people reporting the same content hides it until a moderator looks at it. */
export const AUTO_HIDE_REPORTS = 3;

export const REPORT_REASONS = ["SPAM", "ABUSE", "OFF_TOPIC", "OTHER"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "Spam or advertising",
  ABUSE: "Rude, abusive or hateful",
  OFF_TOPIC: "Off topic",
  OTHER: "Something else",
};

/** Tags are lower-case words and dashes ("ielts-writing"), so the same topic isn't split three ways. */
export function normalizeTag(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^#/, "")
    .replace(/[^a-z0-9ঀ-৿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, TAG_MAX);
}

/** Cleans a list of tags: normalised, no blanks or repeats, at most MAX_TAGS. Returns an error message if too many were given. */
export function cleanTags(raw: unknown): { tags: string[]; error: string | null } {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[,\n]/) : [];
  const tags = [...new Set(list.filter((t): t is string => typeof t === "string").map(normalizeTag).filter(Boolean))];
  if (tags.length > MAX_TAGS) return { tags: tags.slice(0, MAX_TAGS), error: `Use at most ${MAX_TAGS} tags.` };
  return { tags, error: null };
}

/** A problem with a new post's text, or null. */
export function postProblem(title: string, body: string): string | null {
  const t = title.trim();
  const b = body.trim();
  if (t.length < TITLE_MIN) return `The title needs at least ${TITLE_MIN} characters.`;
  if (t.length > TITLE_MAX) return `The title is too long (${TITLE_MAX} characters at most).`;
  if (b.length < POST_BODY_MIN) return `Write a little more: at least ${POST_BODY_MIN} characters.`;
  if (b.length > POST_BODY_MAX) return `That is too long (${POST_BODY_MAX} characters at most).`;
  return null;
}

export function commentProblem(body: string): string | null {
  const b = body.trim();
  if (!b) return "Write something before posting.";
  if (b.length > COMMENT_MAX) return `That is too long (${COMMENT_MAX} characters at most).`;
  return null;
}

/** Roughly how much of a piece of text is the same character or the same short word repeated (spam-like). */
export function looksLikeSpam(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  if (/(.)\1{14,}/.test(t)) return true;
  const words = t.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 8 && new Set(words).size / words.length < 0.25) return true;
  const links = (t.match(/https?:\/\//gi) ?? []).length;
  return links >= 4;
}

export type Sort = "latest" | "top" | "unanswered";
export const SORTS: Sort[] = ["latest", "top", "unanswered"];
export const SORT_LABELS: Record<Sort, string> = { latest: "Latest activity", top: "Most liked", unanswered: "Unanswered questions" };

// ---------- Speaking rooms ----------

export const ROOM_DURATIONS = [15, 30, 45, 60] as const;
export const ROOM_CAPACITY_MIN = 2;
export const ROOM_CAPACITY_MAX = 6;
export const ROOM_MIN_LEAD_MINUTES = 15;
export const MAX_HOSTED_ROOMS = 3;
export const MAX_JOINED_ROOMS = 5;
export const ROOM_TITLE_MAX = 100;
/** Members can open the meeting link from this long before the start until this long after the end. */
export const ROOM_OPEN_EARLY_MINUTES = 10;
export const ROOM_OPEN_LATE_MINUTES = 15;

const MINUTE = 60_000;
export type RoomTimes = { startsAt: string; durationMinutes: number; status: "SCHEDULED" | "CANCELLED" };

export const roomStart = (r: { startsAt: string }) => new Date(r.startsAt).getTime();
export const roomEnd = (r: { startsAt: string; durationMinutes: number }) => roomStart(r) + r.durationMinutes * MINUTE;

export type RoomState = "UPCOMING" | "LIVE" | "FINISHED" | "CANCELLED";
export function roomState(r: RoomTimes, now: Date = new Date()): RoomState {
  if (r.status === "CANCELLED") return "CANCELLED";
  const t = now.getTime();
  if (t < roomStart(r)) return "UPCOMING";
  return t < roomEnd(r) ? "LIVE" : "FINISHED";
}

/** People can still join or leave until the room ends. */
export const roomIsOpen = (r: RoomTimes, now: Date = new Date()) => r.status === "SCHEDULED" && now.getTime() < roomEnd(r);

/** Members can open the link within a window around the session. */
export function canOpenRoomLink(r: RoomTimes, now: Date = new Date()): boolean {
  if (r.status !== "SCHEDULED") return false;
  const t = now.getTime();
  return t >= roomStart(r) - ROOM_OPEN_EARLY_MINUTES * MINUTE && t < roomEnd(r) + ROOM_OPEN_LATE_MINUTES * MINUTE;
}

export const roomsOverlap = (a: { startsAt: string; durationMinutes: number }, b: { startsAt: string; durationMinutes: number }) => roomStart(a) < roomEnd(b) && roomStart(b) < roomEnd(a);

/** How a person appears in the community: teachers and admins by full name (with a badge), students as first name and last initial. */
export function displayName(name: string, role: string): string {
  if (role !== "STUDENT") return name;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "Student";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export const ROLE_BADGES: Record<string, string | null> = { STUDENT: null, TEACHER: "Verified teacher", ADMIN: "Moderator" };

// ---------- Room types ----------

export const ROOM_TYPES = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "IELTS_SPEAKING", "DEBATE", "JOB_INTERVIEW"] as const;
export type RoomType = (typeof ROOM_TYPES)[number];
export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  IELTS_SPEAKING: "IELTS Speaking",
  DEBATE: "Debate",
  JOB_INTERVIEW: "Job Interview",
};

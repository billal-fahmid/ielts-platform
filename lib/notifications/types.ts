/** Client-safe notification metadata (no database access). */
export const NOTIFICATION_TYPES = [
  "COURSE",
  "TEACHER_FEEDBACK",
  "LIVE_CLASS",
  "ASSIGNMENT",
  "PAYMENT",
  "SUBSCRIPTION",
  "STREAK",
  "ACHIEVEMENT",
  "COMMUNITY",
  "SYSTEM",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_LABELS: Record<NotificationType, string> = {
  COURSE: "Courses",
  TEACHER_FEEDBACK: "Teacher feedback",
  LIVE_CLASS: "Live classes",
  ASSIGNMENT: "Assignments",
  PAYMENT: "Payments",
  SUBSCRIPTION: "Subscription",
  STREAK: "Streaks",
  ACHIEVEMENT: "Achievements",
  COMMUNITY: "Community",
  SYSTEM: "Announcements",
};

export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  url: string | null;
  read: boolean;
  createdAt: string;
};

/** "3 min ago", "2 days ago"... for database timestamps (UTC). */
export function timeAgo(value: string, now = Date.now()): string {
  const ms = new Date(/[TZ]/.test(value) ? value : value.replace(" ", "T") + "Z").getTime();
  const seconds = Math.max(0, Math.round((now - ms) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(ms).toLocaleDateString();
}

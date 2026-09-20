import { db } from "@/lib/db";
import { notifications, profiles, users } from "@/lib/db/schema";
import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { sendEmail } from "@/lib/email";
import { safeInternalUrl, cleanText } from "@/lib/security/http";
import type { NotificationItem, NotificationType } from "@/lib/notifications/types";

export type NotifyInput = {
  type: NotificationType;
  title: string;
  body?: string | null;
  /** Internal link (must start with "/"). Anything else is dropped. */
  url?: string | null;
  /** Also send an email, if the student hasn't switched email notifications off. */
  email?: boolean;
};

const pendingEmails = new Set<Promise<unknown>>();
/** Resolves once every email started so far has finished. For tests and graceful shutdown. */
export async function whenEmailsSettled() {
  await Promise.allSettled([...pendingEmails]);
}

function appUrl() {
  return (process.env.APP_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Creates an in-app notification and optionally emails it. Email never delays or breaks the caller. */
export function notify(userId: string, input: NotifyInput) {
  const id = newId();
  const url = safeInternalUrl(input.url);
  db.insert(notifications)
    .values({ id, userId, type: input.type, title: cleanText(input.title).slice(0, 160), body: input.body ? cleanText(input.body).slice(0, 600) : null, url })
    .run();

  if (input.email) {
    const target = db
      .select({ email: users.email, allowed: profiles.emailNotifications })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, userId))
      .get();
    if (target && target.allowed !== false) {
      const p = sendEmail({
        to: target.email,
        userId,
        subject: cleanText(input.title).slice(0, 160),
        title: cleanText(input.title),
        body: input.body ?? "",
        ctaLabel: url ? "Open" : undefined,
        ctaUrl: url ? appUrl() + url : undefined,
      }).finally(() => pendingEmails.delete(p));
      pendingEmails.add(p);
    }
  }
  return id;
}

type Row = typeof notifications.$inferSelect;
const toItem = (r: Row): NotificationItem => ({ id: r.id, type: r.type, title: r.title, body: r.body, url: r.url, read: !!r.readAt, createdAt: r.createdAt });

export function unreadCount(userId: string): number {
  return db
    .select({ n: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .get()?.n ?? 0;
}

/** Newest first, paged with a cursor so long histories stay fast. */
export function listNotifications(userId: string, opts: { limit?: number; cursor?: string | null; type?: NotificationType | null; unreadOnly?: boolean } = {}) {
  const limit = Math.min(50, Math.max(1, opts.limit ?? 20));
  const conditions = [eq(notifications.userId, userId)];
  if (opts.type) conditions.push(eq(notifications.type, opts.type));
  if (opts.unreadOnly) conditions.push(isNull(notifications.readAt));
  if (opts.cursor) {
    const [createdAt, id] = opts.cursor.split("|");
    if (createdAt && id) conditions.push(or(lt(notifications.createdAt, createdAt), and(eq(notifications.createdAt, createdAt), lt(notifications.id, id)))!);
  }
  const rows = db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit + 1)
    .all();
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return { items: page.map(toItem), nextCursor: rows.length > limit && last ? `${last.createdAt}|${last.id}` : null };
}

/** Marks notifications as read. Only this user's own rows are touched. */
export function markRead(userId: string, ids: string[]) {
  if (ids.length === 0) return 0;
  const now = new Date().toISOString();
  const result = db
    .update(notifications)
    .set({ readAt: now })
    .where(and(eq(notifications.userId, userId), inArray(notifications.id, ids.slice(0, 200)), isNull(notifications.readAt)))
    .run();
  return result.changes;
}

export function markAllRead(userId: string) {
  return db.update(notifications).set({ readAt: new Date().toISOString() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))).run().changes;
}

export function setEmailPreference(userId: string, enabled: boolean) {
  db.update(profiles).set({ emailNotifications: enabled }).where(eq(profiles.userId, userId)).run();
}

export type Audience = "ALL" | "STUDENTS" | "TEACHERS";

/** Sends an announcement to a group of users. Returns how many were notified. */
export function broadcast(audience: Audience, input: Omit<NotifyInput, "type">) {
  const roles = audience === "STUDENTS" ? (["STUDENT"] as const) : audience === "TEACHERS" ? (["TEACHER"] as const) : (["STUDENT", "TEACHER", "ADMIN"] as const);
  const recipients = db.select({ id: users.id }).from(users).where(inArray(users.role, [...roles])).all();
  for (const r of recipients) notify(r.id, { ...input, type: "SYSTEM" });
  return recipients.length;
}

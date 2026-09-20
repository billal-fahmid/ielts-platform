import { NextResponse } from "next/server";
import { requireUser } from "@/lib/security/guards";
import { listNotifications, unreadCount } from "@/lib/services/notifications";
import { NOTIFICATION_TYPES, type NotificationType } from "@/lib/notifications/types";

export async function GET(req: Request) {
  const g = await requireUser();
  if (!g.ok) return g.response;

  const url = new URL(req.url);
  const typeParam = url.searchParams.get("type");
  const type = typeParam && (NOTIFICATION_TYPES as readonly string[]).includes(typeParam) ? (typeParam as NotificationType) : null;
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const { items, nextCursor } = listNotifications(g.user.id, {
    limit: Number.isFinite(limit) ? limit : 20,
    cursor: url.searchParams.get("cursor"),
    type,
    unreadOnly: url.searchParams.get("unread") === "1",
  });
  return NextResponse.json({ items, nextCursor, unread: unreadCount(g.user.id) }, { headers: { "Cache-Control": "private, no-store" } });
}

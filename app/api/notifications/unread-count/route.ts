import { NextResponse } from "next/server";
import { requireUser } from "@/lib/security/guards";
import { unreadCount } from "@/lib/services/notifications";

/** A tiny endpoint the bell polls, so it stays cheap on slow connections. */
export async function GET() {
  const g = await requireUser();
  if (!g.ok) return g.response;
  return NextResponse.json({ unread: unreadCount(g.user.id) }, { headers: { "Cache-Control": "private, no-store" } });
}

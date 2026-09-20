import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { markAllRead, markRead, unreadCount } from "@/lib/services/notifications";

const schema = z.object({ ids: z.array(z.string().max(64)).max(200).optional(), all: z.boolean().optional() });

export async function POST(req: Request) {
  const g = await requireUser();
  if (!g.ok) return g.response;
  const body = await readJson(req, schema);
  if (!body.ok) return body.response;

  if (body.data.all) markAllRead(g.user.id);
  else if (body.data.ids?.length) markRead(g.user.id, body.data.ids);
  else return NextResponse.json({ error: "Nothing to mark." }, { status: 400 });
  return NextResponse.json({ unread: unreadCount(g.user.id) });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";
import { broadcast } from "@/lib/services/notifications";

const schema = z.object({
  audience: z.enum(["ALL", "STUDENTS", "TEACHERS"]),
  title: z.string().trim().min(3, "Add a title (at least 3 characters).").max(120),
  body: z.string().trim().max(500).optional(),
  url: z.string().trim().max(300).optional(),
  email: z.boolean().optional(),
});

/** Administrators send an announcement to a group. */
export async function POST(req: Request) {
  const g = await requireRole("ADMIN");
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "broadcast", limit: 10, windowSeconds: 3600, key: g.user.id });
  if (limited) return limited;

  const body = await readJson(req, schema);
  if (!body.ok) return body.response;
  const { audience, title, body: text, url, email } = body.data;
  if (url && !/^\/(?![/\\])/.test(url)) return NextResponse.json({ error: "The link must be a page on this site, starting with “/”." }, { status: 400 });

  const sent = broadcast(audience, { title, body: text ?? null, url: url || null, email: !!email });
  audit({ actorId: g.user.id, actorRole: g.user.role, action: "notification.broadcast", entityType: "notifications", metadata: { audience, title, recipients: sent, email: !!email } }, req);
  return NextResponse.json({ sent });
}

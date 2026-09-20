import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { audit } from "@/lib/security/audit";
import { extendSubscription, revokeSubscription } from "@/lib/services/plans";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("revoke") }),
  z.object({ action: z.literal("extend"), days: z.number().int().min(1).max(3650) }),
]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("ADMIN");
  if (!g.ok) return g.response;
  const body = await readJson(req, schema);
  if (!body.ok) return body.response;
  const { id } = await params;

  const updated = body.data.action === "revoke" ? revokeSubscription(id) : extendSubscription(id, body.data.days);
  if (!updated) return NextResponse.json({ error: "That subscription isn't active." }, { status: 404 });
  audit(
    { actorId: g.user.id, actorRole: g.user.role, action: body.data.action === "revoke" ? "subscription.revoke" : "subscription.extend", entityType: "subscriptions", entityId: id, metadata: body.data.action === "extend" ? { days: body.data.days } : {} },
    req
  );
  return NextResponse.json({ ok: true, currentPeriodEnd: updated.currentPeriodEnd, status: updated.status });
}

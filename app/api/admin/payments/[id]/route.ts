import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";
import { logError } from "@/lib/security/error-log";
import { PaymentError, approvePayment, refundPayment, rejectPayment } from "@/lib/services/payments";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().max(300) }),
  z.object({ action: z.literal("refund"), reason: z.string().trim().max(300) }),
]);

/** An administrator confirms, rejects or refunds a payment. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireRole("ADMIN");
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "admin-payments", limit: 120, windowSeconds: 60, key: g.user.id });
  if (limited) return limited;
  const body = await readJson(req, schema, 5_000);
  if (!body.ok) return body.response;
  const { id } = await params;

  try {
    const tx =
      body.data.action === "approve" ? approvePayment(id, g.user.id) : body.data.action === "reject" ? rejectPayment(id, g.user.id, body.data.reason) : refundPayment(id, g.user.id, body.data.reason);
    audit(
      { actorId: g.user.id, actorRole: g.user.role, action: `payment.${body.data.action}`, entityType: "transactions", entityId: tx.id, metadata: { amount: tx.amount, method: tx.method, reason: "reason" in body.data ? body.data.reason : undefined } },
      req
    );
    return NextResponse.json({ status: tx.status });
  } catch (e) {
    if (e instanceof PaymentError) return NextResponse.json({ error: e.message }, { status: 400 });
    logError("api:/api/admin/payments", e, { method: "POST", userId: g.user.id });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

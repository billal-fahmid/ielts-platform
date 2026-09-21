import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";
import { logError } from "@/lib/security/error-log";
import { PaymentError, submitManualPayment } from "@/lib/services/payments";

const schema = z.object({ reference: z.string().trim().min(1, "Enter the transaction ID.").max(60), senderNumber: z.string().trim().max(20).optional() });

/** The student reports the transaction ID of money they sent. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "payment-submit", limit: 20, windowSeconds: 3600, key: g.user.id });
  if (limited) return limited;
  const body = await readJson(req, schema, 5_000);
  if (!body.ok) return body.response;
  const { id } = await params;

  try {
    const tx = submitManualPayment({ transactionId: id, userId: g.user.id, reference: body.data.reference, senderNumber: body.data.senderNumber });
    audit({ actorId: g.user.id, actorRole: g.user.role, action: "payment.submit", entityType: "transactions", entityId: tx.id, metadata: { method: tx.method, amount: tx.amount } }, req);
    return NextResponse.json({ status: tx.status });
  } catch (e) {
    if (e instanceof PaymentError) return NextResponse.json({ error: e.message }, { status: 400 });
    logError("api:/api/payments/submit", e, { method: "POST", userId: g.user.id });
    return NextResponse.json({ error: "We couldn't save that. Please try again." }, { status: 500 });
  }
}

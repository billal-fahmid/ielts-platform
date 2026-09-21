import { NextResponse } from "next/server";
import { requireUser } from "@/lib/security/guards";
import { audit } from "@/lib/security/audit";
import { PaymentError, cancelPendingPayment } from "@/lib/services/payments";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requireUser();
  if (!g.ok) return g.response;
  const { id } = await params;
  try {
    const tx = cancelPendingPayment(id, g.user.id);
    audit({ actorId: g.user.id, actorRole: g.user.role, action: "payment.cancel", entityType: "transactions", entityId: tx.id }, req);
    return NextResponse.json({ status: tx.status });
  } catch (e) {
    if (e instanceof PaymentError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}

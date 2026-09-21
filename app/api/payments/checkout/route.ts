import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { logError } from "@/lib/security/error-log";
import { audit } from "@/lib/security/audit";
import { PAYMENT_METHODS } from "@/lib/payments/types";
import { appBaseUrl } from "@/lib/payments/urls";
import { PaymentError, createCheckout } from "@/lib/services/payments";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 60;

const schema = z.object({
  planCode: z.string().trim().min(1).max(20),
  period: z.enum(["MONTHLY", "YEARLY"]),
  method: z.enum(PAYMENT_METHODS),
  couponCode: z.string().trim().max(40).optional(),
  courseId: z.string().trim().max(64).optional(),
});

/** Starts a payment for the signed-in student. */
export async function POST(req: Request) {
  const g = await requireUser();
  if (!g.ok) return g.response;
  if (g.user.role !== "STUDENT") return NextResponse.json({ error: "Teacher and admin accounts already have full access." }, { status: 400 });
  const limited = rateLimit(req, { name: "payment-checkout", limit: 12, windowSeconds: 3600, key: g.user.id });
  if (limited) return limited;
  const body = await readJson(req, schema, 5_000);
  if (!body.ok) return body.response;

  const base = appBaseUrl(req);
  const phone = db.select({ phone: profiles.phone }).from(profiles).where(eq(profiles.userId, g.user.id)).get()?.phone;
  try {
    const { transaction, redirectUrl } = await createCheckout(
      { userId: g.user.id, ...body.data },
      {
        customer: { name: g.user.name ?? "Student", email: g.user.email ?? "", phone },
        returnUrl: (id) => `${base}/api/payments/return/${id}`,
        notifyUrl: (provider) => `${base}/api/webhooks/payments/${provider}`,
      }
    );
    audit({ actorId: g.user.id, actorRole: g.user.role, action: "payment.create", entityType: "transactions", entityId: transaction.id, metadata: { method: transaction.method, amount: transaction.amount, plan: body.data.planCode, coupon: transaction.couponCode } }, req);
    return NextResponse.json({ transactionId: transaction.id, status: transaction.status, redirectUrl: redirectUrl ?? null });
  } catch (e) {
    if (e instanceof PaymentError) return NextResponse.json({ error: e.message }, { status: 400 });
    logError("api:/api/payments/checkout", e, { method: "POST", userId: g.user.id });
    return NextResponse.json({ error: "We couldn't start your payment. Please try again." }, { status: 500 });
  }
}

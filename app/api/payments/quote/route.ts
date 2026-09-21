import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { quoteCheckout } from "@/lib/services/payments";

const schema = z.object({
  planCode: z.string().trim().min(1).max(20),
  period: z.enum(["MONTHLY", "YEARLY"]),
  couponCode: z.string().trim().max(40).optional(),
  courseId: z.string().trim().max(64).optional(),
});

/** Prices a purchase, with a coupon if one was typed. Changes nothing. */
export async function POST(req: Request) {
  const g = await requireUser();
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "payment-quote", limit: 60, windowSeconds: 600, key: g.user.id });
  if (limited) return limited;
  const body = await readJson(req, schema, 5_000);
  if (!body.ok) return body.response;

  const q = quoteCheckout({ userId: g.user.id, ...body.data });
  if (!q.ok) return NextResponse.json({ error: q.error }, { status: 400 });
  return NextResponse.json({
    plan: { code: q.plan.code, name: q.plan.name },
    period: q.period,
    days: q.days,
    baseAmount: q.baseAmount,
    discount: q.discount,
    total: q.total,
    coupon: q.coupon ? { code: q.coupon.code, description: q.coupon.description } : null,
    renewal: q.renewal,
  });
}

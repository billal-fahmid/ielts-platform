import { db } from "@/lib/db";
import { couponRedemptions, coupons } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { checkCoupon, normalizeCouponCode, type CouponRules } from "@/lib/payments/pricing";

export type Coupon = typeof coupons.$inferSelect;

export function getCouponByCode(code: string): Coupon | undefined {
  const normalized = normalizeCouponCode(code);
  if (!normalized || normalized.length > 40) return undefined;
  return db.select().from(coupons).where(eq(coupons.code, normalized)).get();
}

/** How many times a coupon has been used. Payments that failed (or were cancelled) release their use. */
export function couponUsage(couponId: string, userId?: string) {
  const where = userId ? and(eq(couponRedemptions.couponId, couponId), eq(couponRedemptions.userId, userId)) : eq(couponRedemptions.couponId, couponId);
  return db.select({ n: sql<number>`count(*)` }).from(couponRedemptions).where(where).get()?.n ?? 0;
}

export const toRules = (c: Coupon): CouponRules => ({
  code: c.code,
  type: c.type,
  value: c.value,
  maxDiscount: c.maxDiscount,
  minAmount: c.minAmount,
  startsAt: c.startsAt,
  expiresAt: c.expiresAt,
  usageLimit: c.usageLimit,
  perUserLimit: c.perUserLimit,
  planCodes: (c.planCodes as string[]) ?? [],
  courseIds: (c.courseIds as string[]) ?? [],
  active: c.active,
});

export type CouponEvaluation = { ok: true; coupon: Coupon; discount: number } | { ok: false; reason: string };

/** Looks a code up and checks it against this purchase. The reason is safe to show to the student. */
export function evaluateCoupon(input: { code: string; userId: string; planCode: string; courseId?: string | null; baseAmount: number; now?: number }): CouponEvaluation {
  const coupon = getCouponByCode(input.code);
  if (!coupon) return { ok: false, reason: "That coupon code isn't valid." };
  const result = checkCoupon(toRules(coupon), {
    planCode: input.planCode,
    courseId: input.courseId,
    baseAmount: input.baseAmount,
    usedByUser: couponUsage(coupon.id, input.userId),
    usedTotal: couponUsage(coupon.id),
    now: input.now,
  });
  return result.ok ? { ok: true, coupon, discount: result.discount } : { ok: false, reason: result.reason };
}

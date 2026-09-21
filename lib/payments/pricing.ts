import { PERIOD_DAYS, type BillingPeriod } from "./types";

/** Pure pricing and coupon rules (no database): easy to test and to reason about. */
export type CouponRules = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  maxDiscount: number | null;
  minAmount: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  usageLimit: number | null;
  perUserLimit: number;
  planCodes: string[];
  courseIds: string[];
  active: boolean;
};

export type CouponContext = {
  planCode: string;
  courseId?: string | null;
  baseAmount: number;
  /** Times this student already used it (not counting failed payments). */
  usedByUser: number;
  /** Times anyone used it (not counting failed payments). */
  usedTotal: number;
  now?: number;
};

export type CouponCheck = { ok: true; discount: number } | { ok: false; reason: string };

/** The list price for a plan and period, in whole taka. Null if that period isn't sold. */
export function listPrice(plan: { priceMonthly: number; priceYearly: number | null }, period: BillingPeriod): number | null {
  if (period === "MONTHLY") return plan.priceMonthly > 0 ? plan.priceMonthly : null;
  return plan.priceYearly && plan.priceYearly > 0 ? plan.priceYearly : null;
}

export const periodDays = (period: BillingPeriod) => PERIOD_DAYS[period];

/** How many taka a coupon takes off. Never more than the price, never negative. */
export function computeDiscount(coupon: Pick<CouponRules, "type" | "value" | "maxDiscount">, baseAmount: number): number {
  if (baseAmount <= 0) return 0;
  let discount = coupon.type === "PERCENT" ? Math.floor((baseAmount * coupon.value) / 100) : coupon.value;
  if (coupon.type === "PERCENT" && coupon.maxDiscount !== null && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  return Math.max(0, Math.min(discount, baseAmount));
}

const time = (v: string) => new Date(v.length <= 10 ? v + "T00:00:00Z" : v).getTime();

/** Whether a coupon can be used for this purchase, with a plain-English reason if not. */
export function checkCoupon(coupon: CouponRules, ctx: CouponContext): CouponCheck {
  const now = ctx.now ?? Date.now();
  if (!coupon.active) return { ok: false, reason: "This coupon is no longer active." };
  if (coupon.startsAt && now < time(coupon.startsAt)) return { ok: false, reason: "This coupon isn't valid yet." };
  // An expiry date means the whole of that day.
  if (coupon.expiresAt && now >= (coupon.expiresAt.length <= 10 ? time(coupon.expiresAt) + 86_400_000 : time(coupon.expiresAt))) return { ok: false, reason: "This coupon has expired." };
  if (coupon.usageLimit !== null && ctx.usedTotal >= coupon.usageLimit) return { ok: false, reason: "This coupon has been fully used." };
  if (ctx.usedByUser >= coupon.perUserLimit) return { ok: false, reason: coupon.perUserLimit === 1 ? "You've already used this coupon." : "You've used this coupon the maximum number of times." };
  if (coupon.planCodes.length > 0 && !coupon.planCodes.includes(ctx.planCode)) return { ok: false, reason: `This coupon doesn't apply to the ${ctx.planCode.charAt(0) + ctx.planCode.slice(1).toLowerCase()} plan.` };
  if (coupon.courseIds.length > 0 && !(ctx.courseId && coupon.courseIds.includes(ctx.courseId))) return { ok: false, reason: "This coupon only applies when you upgrade from a specific course." };
  if (coupon.minAmount !== null && ctx.baseAmount < coupon.minAmount) return { ok: false, reason: `This coupon needs a purchase of at least ৳${coupon.minAmount.toLocaleString("en-US")}.` };
  const discount = computeDiscount(coupon, ctx.baseAmount);
  if (discount <= 0) return { ok: false, reason: "This coupon doesn't reduce this price." };
  return { ok: true, discount };
}

export const normalizeCouponCode = (input: string) => input.trim().toUpperCase().replace(/\s+/g, "");

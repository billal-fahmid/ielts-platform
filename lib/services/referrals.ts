import { createHash, randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { referralCodes, referralEvents, users } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { notify } from "@/lib/services/notifications";
import { getEntitlements, grantSubscription } from "@/lib/services/plans";
import { displayName } from "@/lib/community/rules";
import { CODE_ALPHABET, normalizeReferralCode, REFERRAL_CODE_LENGTH, REFERRAL_MAX_REWARDS, REFERRAL_REWARD_DAYS } from "@/lib/growth/rules";

/** The person's own referral code, made the first time it's needed. */
export function getOrCreateCode(userId: string): string {
  const existing = db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).get();
  if (existing) return existing.code;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = Array.from({ length: REFERRAL_CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    const res = db.insert(referralCodes).values({ userId, code }).onConflictDoNothing().run();
    if (res.changes === 1) return code;
    const mine = db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).get();
    if (mine) return mine.code; // another request made it first
  }
  throw new Error("Could not make a referral code");
}

/** Who owns a code. Unknown or malformed codes give null. */
export function ownerOfCode(raw: string | null | undefined): { userId: string; code: string } | null {
  const code = normalizeReferralCode(raw);
  if (!code) return null;
  const row = db.select().from(referralCodes).where(eq(referralCodes.code, code)).get();
  return row ? { userId: row.userId, code } : null;
}

/** A one-way fingerprint so one person clicking a link ten times counts once a day. Never stored in readable form. */
export function visitorFingerprint(ip: string, userAgent: string, code: string, day: string): string {
  return createHash("sha256").update(`${ip}|${userAgent}|${code}|${day}`).digest("hex").slice(0, 32);
}

/** Counts a click on someone's link (once per visitor per day). Returns whether it was a new click. */
export function recordClick(rawCode: string, visitorHash: string): boolean {
  const owner = ownerOfCode(rawCode);
  if (!owner) return false;
  const today = new Date().toISOString().slice(0, 10);
  const seen = db.select().from(referralEvents).where(and(eq(referralEvents.code, owner.code), eq(referralEvents.visitorHash, visitorHash), eq(referralEvents.type, "CLICK"))).all().some((e) => e.createdAt.slice(0, 10) === today);
  if (seen) return false;
  db.insert(referralEvents).values({ id: newId(), referrerId: owner.userId, code: owner.code, type: "CLICK", visitorHash }).run();
  return true;
}

/** Links a new account to the person whose link it came through. You can't refer yourself, and an account is linked once. */
export function recordRegistration(rawCode: string | null | undefined, refereeId: string): boolean {
  const owner = ownerOfCode(rawCode);
  if (!owner || owner.userId === refereeId) return false;
  const res = db.insert(referralEvents).values({ id: newId(), referrerId: owner.userId, code: owner.code, type: "REGISTRATION", refereeId }).onConflictDoNothing().run();
  if (res.changes !== 1) return false;
  const name = db.select({ name: users.name, role: users.role }).from(users).where(eq(users.id, refereeId)).get();
  notify(owner.userId, { type: "SYSTEM", title: `${name ? displayName(name.name, name.role) : "Someone"} joined with your link`, body: `You get ${REFERRAL_REWARD_DAYS} free days when they make their first paid purchase.`, url: "/dashboard/referrals" });
  return true;
}

/**
 * Called when a payment completes. If the buyer came through someone's link and this is their first paid purchase
 * (free purchases, such as a 100% coupon, don't count), the referrer gets free plan days. Each buyer rewards once,
 * and a referrer can earn a limited number of rewards.
 */
export function onPurchaseCompleted(refereeId: string, tx: { id: string; amount: number }): { rewarded: boolean } {
  if (tx.amount <= 0) return { rewarded: false };
  const reg = db.select().from(referralEvents).where(and(eq(referralEvents.type, "REGISTRATION"), eq(referralEvents.refereeId, refereeId))).get();
  if (!reg) return { rewarded: false };
  const earned = db.select().from(referralEvents).where(and(eq(referralEvents.referrerId, reg.referrerId), eq(referralEvents.type, "PURCHASE"))).all().filter((e) => (e.rewardDays ?? 0) > 0).length;
  const referrer = db.select().from(users).where(eq(users.id, reg.referrerId)).get();
  // Teachers and admins already have full access, so there is nothing to give them.
  const eligible = !!referrer && referrer.role === "STUDENT" && earned < REFERRAL_MAX_REWARDS;
  const days = eligible ? REFERRAL_REWARD_DAYS : 0;
  const res = db.insert(referralEvents).values({ id: newId(), referrerId: reg.referrerId, code: reg.code, type: "PURCHASE", refereeId, transactionId: tx.id, rewardDays: days }).onConflictDoNothing().run();
  if (res.changes !== 1 || !eligible) return { rewarded: false };

  const plan = getEntitlements(reg.referrerId).plan;
  grantSubscription({ userId: reg.referrerId, planCode: plan.rank > 0 ? plan.code : "BASIC", days, source: "REFERRAL" });
  notify(reg.referrerId, { type: "SUBSCRIPTION", title: `You earned ${days} free days`, body: "A friend you referred made their first purchase. Thank you for spreading the word!", url: "/dashboard/referrals", email: true });
  return { rewarded: true };
}

export type ReferralStats = ReturnType<typeof referralStats>;

/** Numbers for a member's referral page. Friends are shown by first name and initial only. */
export function referralStats(userId: string) {
  const events = db.select().from(referralEvents).where(eq(referralEvents.referrerId, userId)).orderBy(desc(referralEvents.createdAt)).all();
  const of = (t: "CLICK" | "REGISTRATION" | "PURCHASE") => events.filter((e) => e.type === t);
  const names = new Map(db.select({ id: users.id, name: users.name, role: users.role }).from(users).all().map((u) => [u.id, displayName(u.name, u.role)]));
  const purchases = of("PURCHASE");
  return {
    clicks: of("CLICK").length,
    registrations: of("REGISTRATION").length,
    purchases: purchases.length,
    rewardDays: purchases.reduce((n, e) => n + (e.rewardDays ?? 0), 0),
    rewardsLeft: Math.max(0, REFERRAL_MAX_REWARDS - purchases.filter((e) => (e.rewardDays ?? 0) > 0).length),
    recent: events
      .filter((e) => e.type !== "CLICK")
      .slice(0, 10)
      .map((e) => ({ id: e.id, type: e.type as "REGISTRATION" | "PURCHASE", who: e.refereeId ? (names.get(e.refereeId) ?? "A friend") : "A friend", rewardDays: e.rewardDays ?? 0, createdAt: e.createdAt })),
  };
}

/** For admins: everyone who has referred someone, with their numbers, so unusual patterns are easy to spot. */
export function referralLeaders(limit = 50) {
  const events = db.select().from(referralEvents).all();
  const by = new Map<string, { clicks: number; registrations: number; purchases: number; rewardDays: number }>();
  for (const e of events) {
    const row = by.get(e.referrerId) ?? { clicks: 0, registrations: 0, purchases: 0, rewardDays: 0 };
    if (e.type === "CLICK") row.clicks++;
    else if (e.type === "REGISTRATION") row.registrations++;
    else {
      row.purchases++;
      row.rewardDays += e.rewardDays ?? 0;
    }
    by.set(e.referrerId, row);
  }
  const people = new Map(db.select({ id: users.id, name: users.name, email: users.email }).from(users).all().map((u) => [u.id, u]));
  return [...by.entries()]
    .map(([id, r]) => ({ userId: id, name: people.get(id)?.name ?? "Former member", email: people.get(id)?.email ?? "", code: db.select().from(referralCodes).where(eq(referralCodes.userId, id)).get()?.code ?? "", ...r }))
    .sort((a, b) => b.purchases - a.purchases || b.registrations - a.registrations || b.clicks - a.clicks)
    .slice(0, limit);
}

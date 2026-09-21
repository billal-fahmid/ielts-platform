import { db } from "@/lib/db";
import { plans, subscriptions, userVocabulary, quizAttempts, users } from "@/lib/db/schema";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { notify } from "@/lib/services/notifications";
import { PLAN_FEATURES, type PlanFeature } from "@/lib/plans/features";

export type Plan = typeof plans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;

const DAY_MS = 86_400_000;
const REMINDER_DAYS = 3;
/** Bangladesh is UTC+6 all year, so "today's" limits reset at midnight in Dhaka. */
const DHAKA_OFFSET_MS = 6 * 3_600_000;

const asTime = (value: string) => new Date(/[TZ]/.test(value) ? value : value.replace(" ", "T") + "Z").getTime();

// ---------- plans ----------
export function listPlans(opts: { onlyPublished?: boolean } = {}): Plan[] {
  const all = db.select().from(plans).all().sort((a, b) => a.rank - b.rank);
  return opts.onlyPublished ? all.filter((p) => p.published) : all;
}

export const getPlanByCode = (code: string) => db.select().from(plans).where(eq(plans.code, code)).get();
export const getPlanById = (id: string) => db.select().from(plans).where(eq(plans.id, id)).get();

/** The free plan, or a built-in equivalent if an admin has deleted the row by mistake. */
function freePlan(): Plan {
  return (
    getPlanByCode("FREE") ?? {
      id: "builtin-free", code: "FREE", name: "Free", description: "", priceMonthly: 0, priceYearly: null, features: [], bullets: [],
      vocabPerDay: 5, quizzesPerDay: 3, rank: 0, highlighted: false, published: true, createdAt: null,
    }
  );
}

export const planRank = (code: string | null | undefined) => (code ? getPlanByCode(code)?.rank ?? 0 : 0);

/** The lowest plan that includes a feature, so upgrade prompts can name it. */
export function requiredPlanFor(feature: PlanFeature): Plan | null {
  return listPlans().find((p) => (p.features as string[]).includes(feature)) ?? null;
}

// ---------- subscriptions ----------
function activeSubscriptions(userId: string, now: number) {
  return db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "ACTIVE")))
    .all()
    .filter((s) => asTime(s.currentPeriodEnd) > now);
}

/**
 * Housekeeping that runs whenever a student's access is checked: a subscription whose period has ended
 * is marked expired (with one notification), and one ending within three days gets one reminder.
 */
export function syncSubscriptions(userId: string, now = Date.now()) {
  const rows = db.select().from(subscriptions).where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "ACTIVE"))).all();
  for (const s of rows) {
    const end = asTime(s.currentPeriodEnd);
    const plan = getPlanById(s.planId);
    const name = plan?.name ?? "subscription";
    if (end <= now) {
      db.update(subscriptions).set({ status: "EXPIRED" }).where(eq(subscriptions.id, s.id)).run();
      notify(userId, { type: "SUBSCRIPTION", title: `Your ${name} plan has ended`, body: "You're back on the Free plan. Renew to keep your access.", url: "/dashboard/billing", email: true });
    } else if (!s.reminderSentAt && end - now <= REMINDER_DAYS * DAY_MS) {
      db.update(subscriptions).set({ reminderSentAt: new Date(now).toISOString() }).where(eq(subscriptions.id, s.id)).run();
      const days = Math.max(1, Math.ceil((end - now) / DAY_MS));
      notify(userId, { type: "SUBSCRIPTION", title: `Your ${name} plan ends in ${days} day${days === 1 ? "" : "s"}`, body: "Renew to keep your access without a break.", url: "/dashboard/billing", email: true });
    }
  }
}

export type Entitlements = {
  plan: Plan;
  subscription: Subscription | null;
  features: Set<string>;
  /** Teachers and admins can open everything (they need to review and support student work). */
  staff: boolean;
};

export function getEntitlements(userId: string, now = Date.now()): Entitlements {
  const role = db.select({ role: users.role }).from(users).where(eq(users.id, userId)).get()?.role;
  if (role === "ADMIN" || role === "TEACHER") {
    const all = listPlans();
    const top = all[all.length - 1] ?? freePlan();
    return { plan: top, subscription: null, features: new Set<string>(PLAN_FEATURES), staff: true };
  }

  syncSubscriptions(userId, now);
  const active = activeSubscriptions(userId, now)
    .map((sub) => ({ sub, plan: getPlanById(sub.planId) }))
    .filter((x): x is { sub: Subscription; plan: Plan } => !!x.plan)
    .sort((a, b) => b.plan.rank - a.plan.rank || asTime(b.sub.currentPeriodEnd) - asTime(a.sub.currentPeriodEnd))[0];

  const plan = active?.plan ?? freePlan();
  return { plan, subscription: active?.sub ?? null, features: new Set(plan.features as string[]), staff: false };
}

export const hasFeature = (ent: Entitlements, feature: PlanFeature) => ent.features.has(feature);

/** Whether the student's plan covers a course. */
export function canAccessCourse(ent: Entitlements, course: { requiredPlan: string }) {
  return ent.staff || ent.plan.rank >= planRank(course.requiredPlan);
}

// ---------- daily limits (Free plan) ----------
function dayStart(now = Date.now()) {
  return Math.floor((now + DHAKA_OFFSET_MS) / DAY_MS) * DAY_MS - DHAKA_OFFSET_MS;
}

export function vocabularyWordsToday(userId: string, now = Date.now()) {
  const start = dayStart(now);
  return db.select().from(userVocabulary).where(eq(userVocabulary.userId, userId)).all().filter((v) => v.lastReviewed && asTime(v.lastReviewed) >= start);
}

export function quizAttemptsToday(userId: string, now = Date.now()) {
  const start = dayStart(now);
  return db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId)).all().filter((a) => a.createdAt && asTime(a.createdAt) >= start).length;
}

export type Allowance = { allowed: boolean; used: number; limit: number | null };

/** Rating a word you already rated today is always fine; a new word counts against the daily limit. */
export function vocabAllowance(userId: string, ent: Entitlements, vocabularyId: string, now = Date.now()): Allowance {
  const limit = ent.staff ? null : ent.plan.vocabPerDay;
  const today = vocabularyWordsToday(userId, now);
  if (limit === null || limit === undefined) return { allowed: true, used: today.length, limit: null };
  const already = today.some((v) => v.vocabularyId === vocabularyId);
  return { allowed: already || today.length < limit, used: today.length, limit };
}

export function quizAllowance(userId: string, ent: Entitlements, now = Date.now()): Allowance {
  const limit = ent.staff ? null : ent.plan.quizzesPerDay;
  const used = quizAttemptsToday(userId, now);
  if (limit === null || limit === undefined) return { allowed: true, used, limit: null };
  return { allowed: used < limit, used, limit };
}

// ---------- granting and managing subscriptions ----------
export type GrantInput = { userId: string; planCode: string; days: number; source: Subscription["source"]; transactionId?: string | null };

/** Starts (or extends) a paid plan for a student. Returns null for the free plan or an unknown plan. */
export function grantSubscription(input: GrantInput, now = Date.now()): Subscription | null {
  const plan = getPlanByCode(input.planCode);
  if (!plan || plan.rank <= 0 || input.days < 1 || input.days > 3650) return null;

  const existing = activeSubscriptions(input.userId, now).find((s) => s.planId === plan.id);
  let subId: string;
  if (existing) {
    // Same plan again: add the time to what is left.
    const end = new Date(asTime(existing.currentPeriodEnd) + input.days * DAY_MS).toISOString();
    db.update(subscriptions).set({ currentPeriodEnd: end, reminderSentAt: null, transactionId: input.transactionId ?? existing.transactionId }).where(eq(subscriptions.id, existing.id)).run();
    subId = existing.id;
  } else {
    // A different plan replaces the current one straight away.
    for (const s of activeSubscriptions(input.userId, now)) {
      db.update(subscriptions).set({ status: "CANCELLED", cancelledAt: new Date(now).toISOString() }).where(eq(subscriptions.id, s.id)).run();
    }
    subId = newId();
    db.insert(subscriptions)
      .values({
        id: subId,
        userId: input.userId,
        planId: plan.id,
        source: input.source,
        startedAt: new Date(now).toISOString(),
        currentPeriodEnd: new Date(now + input.days * DAY_MS).toISOString(),
        transactionId: input.transactionId ?? null,
      })
      .run();
  }
  const sub = db.select().from(subscriptions).where(eq(subscriptions.id, subId)).get()!;
  notify(input.userId, {
    type: "SUBSCRIPTION",
    title: `Your ${plan.name} plan is active`,
    body: `You have access until ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`,
    url: "/dashboard/billing",
    email: true,
  });
  return sub;
}

/** Ends a subscription immediately. */
export function revokeSubscription(subscriptionId: string, now = Date.now(), opts: { silent?: boolean } = {}): Subscription | null {
  const s = db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).get();
  if (!s || s.status !== "ACTIVE") return null;
  db.update(subscriptions).set({ status: "CANCELLED", cancelledAt: new Date(now).toISOString() }).where(eq(subscriptions.id, s.id)).run();
  const plan = getPlanById(s.planId);
  if (!opts.silent) {
    notify(s.userId, { type: "SUBSCRIPTION", title: `Your ${plan?.name ?? ""} plan was cancelled`.replace("  ", " "), body: "Contact us if you think this is a mistake.", url: "/dashboard/billing", email: true });
  }
  return db.select().from(subscriptions).where(eq(subscriptions.id, s.id)).get()!;
}

export function extendSubscription(subscriptionId: string, days: number): Subscription | null {
  const s = db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).get();
  if (!s || s.status !== "ACTIVE" || days < 1 || days > 3650) return null;
  db.update(subscriptions).set({ currentPeriodEnd: new Date(asTime(s.currentPeriodEnd) + days * DAY_MS).toISOString(), reminderSentAt: null }).where(eq(subscriptions.id, s.id)).run();
  return db.select().from(subscriptions).where(eq(subscriptions.id, s.id)).get()!;
}

export function listUserSubscriptions(userId: string) {
  return db
    .select({ sub: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.startedAt))
    .all();
}

export function listSubscriptionsForAdmin(opts: { page: number; pageSize: number; email?: string; status?: Subscription["status"] }) {
  const conditions = [];
  if (opts.email) conditions.push(like(users.email, `%${opts.email.replace(/[%_]/g, "")}%`));
  if (opts.status) conditions.push(eq(subscriptions.status, opts.status));
  const where = conditions.length ? and(...conditions) : undefined;
  const base = db.select({ n: sql<number>`count(*)` }).from(subscriptions).innerJoin(users, eq(users.id, subscriptions.userId)).where(where).get();
  const rows = db
    .select({ sub: subscriptions, plan: plans, userName: users.name, userEmail: users.email })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(users, eq(users.id, subscriptions.userId))
    .where(where)
    .orderBy(desc(subscriptions.createdAt), desc(subscriptions.id))
    .limit(opts.pageSize)
    .offset((opts.page - 1) * opts.pageSize)
    .all();
  return { rows, total: base?.n ?? 0 };
}

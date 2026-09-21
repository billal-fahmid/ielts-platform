import { db, sqlite } from "@/lib/db";
import { couponRedemptions, coupons, paymentAccounts, paymentEvents, plans, transactions, users } from "@/lib/db/schema";
import { and, desc, eq, inArray, like, lt, sql } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { notify } from "@/lib/services/notifications";
import { getEntitlements, getPlanByCode, grantSubscription, revokeSubscription, type Plan } from "@/lib/services/plans";
import { evaluateCoupon } from "@/lib/services/coupons";
import { getProvider, providerForMethod } from "@/lib/payments/registry";
import { canTransition } from "@/lib/payments/state";
import { listPrice, periodDays } from "@/lib/payments/pricing";
import { normalizeTransactionId, normalizeWalletNumber } from "@/lib/payments/validation";
import { METHOD_LABELS, isManualMethod, type BillingPeriod, type ManualMethod, type PaymentEvent, type PaymentMethod, type PaymentStatus } from "@/lib/payments/types";
import { formatTaka } from "@/lib/plans/features";

export type Transaction = typeof transactions.$inferSelect;

/** A payment left unpaid this long is closed automatically, which also frees any coupon it held. */
export const PENDING_EXPIRY_HOURS = 24;
const MAX_OPEN_PAYMENTS = 3;

/** A problem the student can fix; its message is safe to show as it is. */
export class PaymentError extends Error {}

const nowIso = () => new Date().toISOString();

// ---------- reading ----------
export const getTransaction = (id: string) => db.select().from(transactions).where(eq(transactions.id, id)).get();

export function listUserTransactions(userId: string, limit = 20) {
  return db
    .select({ tx: transactions, plan: plans })
    .from(transactions)
    .innerJoin(plans, eq(plans.id, transactions.planId))
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(limit)
    .all();
}

export function listTransactionsForAdmin(opts: { page: number; pageSize: number; status?: PaymentStatus; method?: PaymentMethod; email?: string }) {
  const conditions = [];
  if (opts.status) conditions.push(eq(transactions.status, opts.status));
  if (opts.method) conditions.push(eq(transactions.method, opts.method));
  if (opts.email) conditions.push(like(users.email, `%${opts.email.replace(/[%_]/g, "")}%`));
  const where = conditions.length ? and(...conditions) : undefined;
  const total = db.select({ n: sql<number>`count(*)` }).from(transactions).innerJoin(users, eq(users.id, transactions.userId)).where(where).get()?.n ?? 0;
  const rows = db
    .select({ tx: transactions, plan: plans, userName: users.name, userEmail: users.email })
    .from(transactions)
    .innerJoin(plans, eq(plans.id, transactions.planId))
    .innerJoin(users, eq(users.id, transactions.userId))
    .where(where)
    .orderBy(desc(transactions.createdAt), desc(transactions.id))
    .limit(opts.pageSize)
    .offset((opts.page - 1) * opts.pageSize)
    .all();
  return { rows, total };
}

/** A short reference to quote on receipts and in support messages. */
export const receiptNumber = (tx: Pick<Transaction, "id" | "createdAt">) => `BE-${(tx.createdAt ?? "").slice(0, 7).replace("-", "")}-${tx.id.slice(0, 8).toUpperCase()}`;

export function activeAccountFor(method: ManualMethod) {
  return db
    .select()
    .from(paymentAccounts)
    .where(and(eq(paymentAccounts.method, method), eq(paymentAccounts.active, true)))
    .all()
    .sort((a, b) => a.order - b.order)[0];
}

export type MethodOption = { method: PaymentMethod; label: string; available: boolean; note?: string };

/** The ways this platform can take money right now. A method with no account or credentials isn't offered. */
export function availableMethods(): MethodOption[] {
  const manual = (["BKASH", "NAGAD", "ROCKET", "BANK_TRANSFER"] as const).map((m) => ({ method: m, label: METHOD_LABELS[m], available: !!activeAccountFor(m) }));
  const card: MethodOption = { method: "CARD", label: METHOD_LABELS.CARD, available: !!providerForMethod("CARD") };
  return [...manual, card].filter((o) => o.available);
}

// ---------- quote ----------
export type Quote =
  | { ok: true; plan: Plan; period: BillingPeriod; days: number; baseAmount: number; discount: number; total: number; coupon: { id: string; code: string; description: string | null } | null; renewal: boolean }
  | { ok: false; error: string };

export function quoteCheckout(input: { userId: string; planCode: string; period: BillingPeriod; couponCode?: string | null; courseId?: string | null }): Quote {
  const plan = getPlanByCode(input.planCode);
  if (!plan || plan.rank <= 0 || !plan.published) return { ok: false, error: "That plan isn't available." };
  const baseAmount = listPrice(plan, input.period);
  if (baseAmount === null) return { ok: false, error: `The ${input.period === "YEARLY" ? "yearly" : "monthly"} option isn't available for ${plan.name}.` };

  const ent = getEntitlements(input.userId);
  if (ent.staff) return { ok: false, error: "Teacher and admin accounts already have full access." };
  if (ent.plan.rank > plan.rank) return { ok: false, error: `You're on ${ent.plan.name}, which already includes everything in ${plan.name}.` };

  let discount = 0;
  let coupon: { id: string; code: string; description: string | null } | null = null;
  if (input.couponCode && input.couponCode.trim()) {
    const result = evaluateCoupon({ code: input.couponCode, userId: input.userId, planCode: plan.code, courseId: input.courseId, baseAmount });
    if (!result.ok) return { ok: false, error: result.reason };
    discount = result.discount;
    coupon = { id: result.coupon.id, code: result.coupon.code, description: result.coupon.description };
  }
  return { ok: true, plan, period: input.period, days: periodDays(input.period), baseAmount, discount, total: baseAmount - discount, coupon, renewal: ent.plan.id === plan.id };
}

// ---------- housekeeping ----------
/** Closes payments that were started and never paid. */
export function expireStalePending(now = Date.now()) {
  const cutoff = new Date(now - PENDING_EXPIRY_HOURS * 3_600_000).toISOString();
  const stale = db
    .select()
    .from(transactions)
    .where(and(eq(transactions.status, "PENDING"), lt(transactions.createdAt, cutoff.replace("T", " ").slice(0, 19))))
    .all();
  for (const tx of stale) failTransaction(tx.id, "Expired: no payment was reported within 24 hours.", { silent: true });
  return stale.length;
}

// ---------- state changes ----------
function setStatus(tx: Transaction, to: PaymentStatus, extra: Partial<typeof transactions.$inferInsert> = {}) {
  if (!canTransition(tx.status, to)) throw new PaymentError(`A payment that is ${tx.status.toLowerCase()} can't become ${to.toLowerCase()}.`);
  db.update(transactions).set({ status: to, updatedAt: nowIso(), ...extra }).where(eq(transactions.id, tx.id)).run();
}

function releaseCoupon(transactionId: string) {
  db.delete(couponRedemptions).where(eq(couponRedemptions.transactionId, transactionId)).run();
}

/** Marks a payment as paid and gives the student their plan. Safe to call twice: the second call does nothing. */
export function completeTransaction(transactionId: string, opts: { actorId?: string | null; providerRef?: string | null } = {}): Transaction {
  return sqlite.transaction(() => {
    const tx = getTransaction(transactionId);
    if (!tx) throw new PaymentError("Payment not found.");
    if (tx.status === "COMPLETED") return tx;

    const plan = db.select().from(plans).where(eq(plans.id, tx.planId)).get();
    if (!plan) throw new PaymentError("The plan for this payment no longer exists.");

    setStatus(tx, "COMPLETED", { verifiedAt: nowIso(), verifiedBy: opts.actorId ?? null, providerReference: tx.providerReference ?? opts.providerRef ?? null });
    const sub = grantSubscription({ userId: tx.userId, planCode: plan.code, days: tx.days, source: "PAYMENT", transactionId: tx.id });
    if (!sub) throw new PaymentError("Couldn't start the plan for this payment.");
    db.update(transactions).set({ subscriptionId: sub.id }).where(eq(transactions.id, tx.id)).run();

    notify(tx.userId, { type: "PAYMENT", title: `Payment received: ${formatTaka(tx.amount)}`, body: `Thank you! Your ${plan.name} plan is active. Receipt ${receiptNumber(tx)}.`, url: `/dashboard/billing/payments/${tx.id}` });
    return getTransaction(tx.id)!;
  })();
}

/** Closes a payment as not completed and frees its coupon. */
export function failTransaction(transactionId: string, reason: string, opts: { actorId?: string | null; silent?: boolean } = {}): Transaction {
  return sqlite.transaction(() => {
    const tx = getTransaction(transactionId);
    if (!tx) throw new PaymentError("Payment not found.");
    if (tx.status === "FAILED") return tx;
    setStatus(tx, "FAILED", { failureReason: reason.slice(0, 300), verifiedAt: nowIso(), verifiedBy: opts.actorId ?? null });
    releaseCoupon(tx.id);
    if (!opts.silent) {
      notify(tx.userId, { type: "PAYMENT", title: "Your payment wasn't completed", body: reason.slice(0, 300), url: `/dashboard/billing/payments/${tx.id}`, email: true });
    }
    return getTransaction(tx.id)!;
  })();
}

/** Marks a paid payment as refunded and ends the plan it bought. The money itself is returned outside the platform. */
export function refundTransaction(transactionId: string, reason: string, opts: { actorId?: string | null } = {}): Transaction {
  return sqlite.transaction(() => {
    const tx = getTransaction(transactionId);
    if (!tx) throw new PaymentError("Payment not found.");
    if (tx.status === "REFUNDED") return tx;
    setStatus(tx, "REFUNDED", { refundedAt: nowIso(), refundedBy: opts.actorId ?? null, refundReason: reason.slice(0, 300) });
    if (tx.subscriptionId) revokeSubscription(tx.subscriptionId, Date.now(), { silent: true });
    notify(tx.userId, { type: "PAYMENT", title: "Your payment was refunded", body: `${formatTaka(tx.amount)} for receipt ${receiptNumber(tx)}. ${reason}`.slice(0, 300), url: `/dashboard/billing/payments/${tx.id}`, email: true });
    return getTransaction(tx.id)!;
  })();
}

// ---------- checkout ----------
export type CheckoutInput = { userId: string; planCode: string; period: BillingPeriod; method: PaymentMethod; couponCode?: string | null; courseId?: string | null };
export type CheckoutContext = { customer: { name: string; email: string; phone?: string | null }; returnUrl: (transactionId: string) => string; notifyUrl: (providerCode: string) => string };

/** Starts a payment. Manual methods give instructions; a gateway gives a redirect address; a 100% coupon completes at once. */
export async function createCheckout(input: CheckoutInput, ctx: CheckoutContext): Promise<{ transaction: Transaction; redirectUrl?: string }> {
  expireStalePending();

  const quote = quoteCheckout(input);
  if (!quote.ok) throw new PaymentError(quote.error);

  const open = db
    .select({ n: sql<number>`count(*)` })
    .from(transactions)
    .where(and(eq(transactions.userId, input.userId), inArray(transactions.status, ["PENDING", "PROCESSING"])))
    .get()?.n ?? 0;
  if (open >= MAX_OPEN_PAYMENTS) throw new PaymentError("You already have payments waiting. Finish or cancel one before starting another.");

  const free = quote.total === 0;
  const method: PaymentMethod = free ? "COUPON" : input.method;
  let providerCode = "none";
  if (!free) {
    if (method === "COUPON") throw new PaymentError("Choose how you'd like to pay.");
    const provider = providerForMethod(method);
    if (!provider) throw new PaymentError(`${METHOD_LABELS[method]} isn't available right now.`);
    if (isManualMethod(method) && !activeAccountFor(method)) throw new PaymentError(`${METHOD_LABELS[method]} isn't available right now.`);
    providerCode = provider.code;
  }

  // Reserve the coupon and record the payment together, so two checkouts can't both take the last use.
  const txId = newId();
  sqlite.transaction(() => {
    let couponId: string | null = null;
    if (quote.coupon) {
      const recheck = evaluateCoupon({ code: quote.coupon.code, userId: input.userId, planCode: quote.plan.code, courseId: input.courseId, baseAmount: quote.baseAmount });
      if (!recheck.ok) throw new PaymentError(recheck.reason);
      couponId = recheck.coupon.id;
    }
    db.insert(transactions)
      .values({
        id: txId,
        userId: input.userId,
        planId: quote.plan.id,
        period: quote.period,
        days: quote.days,
        baseAmount: quote.baseAmount,
        discountAmount: quote.discount,
        amount: quote.total,
        currency: "BDT",
        couponId,
        couponCode: quote.coupon?.code ?? null,
        courseId: input.courseId ?? null,
        method,
        provider: providerCode,
        status: "PENDING",
      })
      .run();
    if (couponId) db.insert(couponRedemptions).values({ id: newId(), couponId, userId: input.userId, transactionId: txId, discountAmount: quote.discount }).run();
  })();

  if (free) return { transaction: completeTransaction(txId) };

  const provider = getProvider(providerCode)!;
  if (provider.code === "manual") return { transaction: getTransaction(txId)! };

  try {
    const result = await provider.initiate({
      transactionId: txId,
      amount: quote.total,
      currency: "BDT",
      method,
      customer: ctx.customer,
      productName: `${quote.plan.name} plan (${quote.period === "YEARLY" ? "1 year" : "1 month"})`,
      returnUrl: ctx.returnUrl(txId),
      notifyUrl: ctx.notifyUrl(provider.code),
    });
    if (result.kind === "redirect") {
      if (result.providerRef) db.update(transactions).set({ providerReference: result.providerRef, status: "PROCESSING", updatedAt: nowIso() }).where(eq(transactions.id, txId)).run();
      return { transaction: getTransaction(txId)!, redirectUrl: result.url };
    }
    return { transaction: getTransaction(txId)! };
  } catch (err) {
    failTransaction(txId, "We couldn't reach the payment service. Please try again.", { silent: true });
    throw new PaymentError("We couldn't start your card payment. Please try again in a moment.");
  }
}

// ---------- manual payments ----------
export type SubmitInput = { transactionId: string; userId: string; reference: string; senderNumber?: string | null };

/** The student reports the transaction ID of the money they sent. An admin then checks it. */
export function submitManualPayment(input: SubmitInput): Transaction {
  const tx = getTransaction(input.transactionId);
  if (!tx || tx.userId !== input.userId) throw new PaymentError("Payment not found.");
  if (!isManualMethod(tx.method)) throw new PaymentError("This payment doesn't take a transaction ID.");
  if (tx.status !== "PENDING") throw new PaymentError("This payment has already been reported.");

  const reference = normalizeTransactionId(tx.method, input.reference);
  if (!reference) throw new PaymentError(`That doesn't look like a valid ${METHOD_LABELS[tx.method]} transaction ID. Copy it exactly from your confirmation message.`);
  let sender: string | null = null;
  if (tx.method !== "BANK_TRANSFER") {
    sender = normalizeWalletNumber(tx.method, input.senderNumber ?? "");
    if (!sender) throw new PaymentError(`Enter the ${METHOD_LABELS[tx.method]} number you paid from, for example 01712345678.`);
  }

  try {
    setStatus(tx, "PROCESSING", { providerReference: reference, senderNumber: sender, submittedAt: nowIso() });
  } catch (e) {
    if (e instanceof PaymentError) throw e;
    if (/UNIQUE/i.test((e as Error).message)) throw new PaymentError("That transaction ID has already been used for another payment. Check it and try again, or contact us.");
    throw e;
  }

  const plan = db.select().from(plans).where(eq(plans.id, tx.planId)).get();
  notify(tx.userId, { type: "PAYMENT", title: "We're checking your payment", body: `Thanks! We'll confirm ${formatTaka(tx.amount)} for the ${plan?.name ?? ""} plan soon, usually within a few hours.`, url: `/dashboard/billing/payments/${tx.id}` });
  for (const admin of db.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN")).all()) {
    notify(admin.id, { type: "PAYMENT", title: "Payment to check", body: `${METHOD_LABELS[tx.method]} ${formatTaka(tx.amount)} · ${reference}`, url: "/admin/payments" });
  }
  return getTransaction(tx.id)!;
}

/** The student gives up on a payment they haven't reported yet. */
export function cancelPendingPayment(transactionId: string, userId: string): Transaction {
  const tx = getTransaction(transactionId);
  if (!tx || tx.userId !== userId) throw new PaymentError("Payment not found.");
  if (tx.status !== "PENDING") throw new PaymentError("Only a payment that hasn't been reported yet can be cancelled.");
  return failTransaction(tx.id, "Cancelled by you.", { silent: true });
}

// ---------- gateway callbacks ----------
export type EventOutcome = { outcome: "APPLIED" | "IGNORED" | "REJECTED"; note: string; transactionId?: string };

/**
 * Applies a verified provider event. It is idempotent (the same event twice changes nothing), checks the
 * amount and currency, and follows the payment state rules. The caller must have verified the event's
 * authenticity first (provider.verifyWebhook).
 */
export function applyPaymentEvent(providerCode: string, event: PaymentEvent): EventOutcome {
  return sqlite.transaction((): EventOutcome => {
    const record = (outcome: EventOutcome["outcome"], note: string, transactionId?: string) => {
      db.insert(paymentEvents).values({ id: newId(), provider: providerCode, eventId: event.eventId, type: event.type, transactionId: transactionId ?? null, outcome, note }).run();
      return { outcome, note, transactionId };
    };

    if (db.select().from(paymentEvents).where(and(eq(paymentEvents.provider, providerCode), eq(paymentEvents.eventId, event.eventId))).get()) {
      return { outcome: "IGNORED", note: "Duplicate event." };
    }

    const tx = getTransaction(event.reference);
    if (!tx) return record("REJECTED", "Unknown transaction.");
    if (providerCode !== "signed" && tx.provider !== providerCode) return record("REJECTED", "This payment belongs to a different provider.", tx.id);

    if (event.type === "payment.succeeded") {
      if (tx.status === "COMPLETED") return record("IGNORED", "Already paid.", tx.id);
      if (tx.status === "FAILED" || tx.status === "REFUNDED") return record("REJECTED", `The payment was already ${tx.status.toLowerCase()}.`, tx.id);
      if (event.currency && event.currency !== tx.currency) return record("REJECTED", "Currency doesn't match.", tx.id);
      if (event.amount === undefined || Math.abs(event.amount - tx.amount) > 0.009) return record("REJECTED", "Amount doesn't match.", tx.id);
      completeTransaction(tx.id, { providerRef: event.providerRef });
      return record("APPLIED", "Payment completed.", tx.id);
    }

    if (event.type === "payment.failed") {
      if (tx.status !== "PENDING" && tx.status !== "PROCESSING") return record("IGNORED", "Nothing to fail.", tx.id);
      failTransaction(tx.id, "The payment was not completed.");
      return record("APPLIED", "Payment marked as failed.", tx.id);
    }

    // payment.refunded
    if (tx.status !== "COMPLETED") return record("IGNORED", "Nothing to refund.", tx.id);
    refundTransaction(tx.id, "Refunded by the payment provider.");
    return record("APPLIED", "Payment refunded.", tx.id);
  })();
}

export const couponForTransaction = (couponId: string | null) => (couponId ? db.select().from(coupons).where(eq(coupons.id, couponId)).get() : undefined);

// ---------- admin actions ----------
/** An admin confirms the money arrived. Only payments the student has reported can be approved. */
export function approvePayment(transactionId: string, adminId: string): Transaction {
  const tx = getTransaction(transactionId);
  if (!tx) throw new PaymentError("Payment not found.");
  if (tx.status === "COMPLETED") return tx;
  if (tx.status !== "PROCESSING") throw new PaymentError("Only a payment the student has reported can be approved.");
  return completeTransaction(tx.id, { actorId: adminId });
}

/** An admin says the money didn't arrive (or the details were wrong). The student sees the reason. */
export function rejectPayment(transactionId: string, adminId: string, reason: string): Transaction {
  const cleaned = reason.trim();
  if (cleaned.length < 3) throw new PaymentError("Give the student a reason (at least 3 characters).");
  const tx = getTransaction(transactionId);
  if (!tx) throw new PaymentError("Payment not found.");
  if (tx.status !== "PENDING" && tx.status !== "PROCESSING") throw new PaymentError("Only a payment that isn't finished can be rejected.");
  return failTransaction(tx.id, cleaned, { actorId: adminId });
}

export function refundPayment(transactionId: string, adminId: string, reason: string): Transaction {
  const cleaned = reason.trim();
  if (cleaned.length < 3) throw new PaymentError("Say why it is being refunded (at least 3 characters).");
  const tx = getTransaction(transactionId);
  if (!tx) throw new PaymentError("Payment not found.");
  if (tx.status === "REFUNDED") return tx; // already done: refunding twice changes nothing
  if (tx.status !== "COMPLETED") throw new PaymentError("Only a paid payment can be refunded.");
  return refundTransaction(tx.id, cleaned, { actorId: adminId });
}

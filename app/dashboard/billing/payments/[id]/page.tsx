import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { plans, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { activeAccountFor, getTransaction, receiptNumber } from "@/lib/services/payments";
import { METHOD_LABELS, STATUS_LABELS, STATUS_TONES, isManualMethod } from "@/lib/payments/types";
import { TRANSACTION_ID_HINT } from "@/lib/payments/validation";
import { formatTaka } from "@/lib/plans/features";
import { checkoutHref } from "@/lib/plans/checkout";
import { CancelPaymentButton, CopyButton, ManualPaymentForm, PrintButton, RefreshStatusButton } from "@/components/payments/payment-controls";
import { CheckCircle2, Clock, XCircle, Undo2 } from "lucide-react";

export const metadata = { title: "Payment — BanglaEnglish" };

const date = (iso: string | null) => (iso ? new Date(/[TZ]/.test(iso) ? iso : iso.replace(" ", "T") + "Z").toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;

  const tx = getTransaction(id);
  if (!tx || tx.userId !== userId) redirect("/dashboard/billing");

  const plan = db.select().from(plans).where(eq(plans.id, tx.planId)).get();
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  const manualMethod = isManualMethod(tx.method) ? tx.method : null;
  const manual = manualMethod !== null;
  const account = manualMethod ? activeAccountFor(manualMethod) : undefined;
  const periodLabel = tx.period === "YEARLY" ? "1 year" : "1 month";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/dashboard/billing" className="text-sm text-ink-soft hover:text-ink print:hidden">
        ← My plan
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">
            {plan?.name} plan · {periodLabel}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Receipt {receiptNumber(tx)}</p>
        </div>
        <span data-testid="payment-status">
          <Badge tone={STATUS_TONES[tx.status]} className="text-sm">
            {STATUS_LABELS[tx.status]}
          </Badge>
        </span>
      </div>

      {tx.status === "PENDING" && manual && (
        <>
          <Card className="flex flex-col gap-4 p-6 print:hidden" data-testid="pay-instructions">
            <h2 className="font-display text-lg text-ink">Step 1: Send {formatTaka(tx.amount)}</h2>
            {account ? (
              <>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-ink-soft">Send with</dt>
                    <dd className="font-medium text-ink">{METHOD_LABELS[tx.method]}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Account name</dt>
                    <dd className="font-medium text-ink">{account.accountName}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-ink-soft">{tx.method === "BANK_TRANSFER" ? "Account number" : `${METHOD_LABELS[tx.method]} number`}</dt>
                    <dd className="flex flex-wrap items-center gap-3 font-display text-2xl text-ink" data-testid="account-number">
                      {account.accountNumber}
                      <CopyButton value={account.accountNumber} label="account number" />
                    </dd>
                  </div>
                  {tx.method === "BANK_TRANSFER" && (
                    <div className="sm:col-span-2">
                      <dt className="text-ink-soft">Bank</dt>
                      <dd className="text-ink">
                        {account.bankName}
                        {account.branch ? `, ${account.branch}` : ""}
                      </dd>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <dt className="text-ink-soft">Amount</dt>
                    <dd className="font-medium text-ink">{formatTaka(tx.amount)} (send exactly this amount)</dd>
                  </div>
                </dl>
                {account.instructions && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-ink">{account.instructions}</p>}
              </>
            ) : (
              <p className="text-sm text-danger">This payment method isn&apos;t available right now. Please cancel this payment and choose another method.</p>
            )}
          </Card>

          <Card className="p-6 print:hidden" data-testid="pay-report">
            <h2 className="font-display text-lg text-ink">Step 2: Tell us the transaction ID</h2>
            <p className="mb-4 mt-1 text-sm text-ink-soft">After you send the money, you&apos;ll get a confirmation message. Copy the transaction ID from it. We check it against our account and switch on your plan.</p>
            <ManualPaymentForm transactionId={tx.id} methodLabel={METHOD_LABELS[tx.method]} needsSender={tx.method !== "BANK_TRANSFER"} hint={TRANSACTION_ID_HINT[tx.method as "BKASH"]} />
          </Card>
          <div className="print:hidden">
            <CancelPaymentButton transactionId={tx.id} />
          </div>
          <p className="text-xs text-ink-soft print:hidden">This payment expires after 24 hours if you haven&apos;t reported it.</p>
        </>
      )}

      {tx.status === "PENDING" && !manual && (
        <Card className="flex flex-col items-start gap-3 p-6">
          <p className="flex items-center gap-2 text-sm text-ink">
            <Clock className="h-4 w-4 text-primary" /> Waiting for confirmation from the payment service.
          </p>
          <p className="text-sm text-ink-soft">If you finished paying, this page updates once your bank confirms. It can take a minute.</p>
          <RefreshStatusButton />
        </Card>
      )}

      {tx.status === "PROCESSING" && (
        <Card className="flex flex-col items-start gap-3 p-6" data-testid="pay-processing">
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <Clock className="h-4 w-4 text-primary" /> {manual ? "We're checking your payment." : "Waiting for confirmation from the payment service."}
          </p>
          {manual ? (
            <p className="text-sm text-ink-soft">
              You reported transaction ID <strong className="text-ink">{tx.providerReference}</strong>
              {tx.senderNumber ? ` from ${tx.senderNumber}` : ""} on {date(tx.submittedAt)}. We usually confirm within a few hours, and we&apos;ll notify you (and email you) when your plan is active.
            </p>
          ) : (
            <p className="text-sm text-ink-soft">This page updates once your bank confirms.</p>
          )}
          <RefreshStatusButton />
        </Card>
      )}

      {tx.status === "FAILED" && (
        <Card className="flex flex-col items-start gap-3 border-danger/40 p-6" data-testid="pay-failed">
          <p className="flex items-center gap-2 text-sm font-medium text-danger">
            <XCircle className="h-4 w-4" /> This payment wasn&apos;t completed.
          </p>
          {tx.failureReason && <p className="text-sm text-ink">{tx.failureReason}</p>}
          <div className="flex flex-wrap gap-2">
            {plan && <LinkButton href={checkoutHref(plan.code, tx.period === "YEARLY" ? "yearly" : "monthly")}>Try again</LinkButton>}
            <LinkButton href="/contact" variant="outline">
              Contact us
            </LinkButton>
          </div>
        </Card>
      )}

      {(tx.status === "COMPLETED" || tx.status === "REFUNDED") && (
        <Card className="flex flex-col gap-4 p-6" data-testid="receipt">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`flex items-center gap-2 text-sm font-medium ${tx.status === "COMPLETED" ? "text-success" : "text-ink"}`}>
              {tx.status === "COMPLETED" ? <CheckCircle2 className="h-4 w-4" /> : <Undo2 className="h-4 w-4" />}
              {tx.status === "COMPLETED" ? `Thank you! Your ${plan?.name} plan is active.` : `Refunded on ${date(tx.refundedAt)}.`}
            </p>
            <PrintButton />
          </div>
          {tx.status === "REFUNDED" && tx.refundReason && <p className="text-sm text-ink-soft">{tx.refundReason}</p>}
          <hr className="border-border" />
          <p className="font-display text-lg text-ink">Receipt {receiptNumber(tx)}</p>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <Row label="Student" value={`${user?.name} (${user?.email})`} />
            <Row label="Date" value={date(tx.verifiedAt ?? tx.createdAt)} />
            <Row label="Plan" value={`${plan?.name} · ${periodLabel}`} />
            <Row label="Paid with" value={METHOD_LABELS[tx.method]} />
            {tx.providerReference && <Row label="Transaction ID" value={tx.providerReference} />}
            <Row label="List price" value={formatTaka(tx.baseAmount)} />
            {tx.discountAmount > 0 && <Row label={`Coupon ${tx.couponCode ?? ""}`} value={`−${formatTaka(tx.discountAmount)}`} />}
            <Row label="Total" value={formatTaka(tx.amount)} strong />
          </dl>
          <div className="flex flex-wrap gap-2 print:hidden">
            <LinkButton href="/dashboard/billing" size="sm">
              My plan
            </LinkButton>
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border py-1.5 sm:block sm:border-0">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={strong ? "font-medium text-ink" : "text-ink"}>{value}</dd>
    </div>
  );
}

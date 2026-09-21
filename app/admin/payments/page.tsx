import { db } from "@/lib/db";
import { paymentAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePageRole } from "@/lib/security/guards";
import { getProviders } from "@/lib/payments/registry";
import { expireStalePending, listTransactionsForAdmin, receiptNumber } from "@/lib/services/payments";
import { METHOD_LABELS, PAYMENT_METHODS, PAYMENT_STATUSES, STATUS_LABELS, STATUS_TONES, type PaymentMethod, type PaymentStatus } from "@/lib/payments/types";
import { formatTaka } from "@/lib/plans/features";
import { appBaseUrl } from "@/lib/payments/urls";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pager, PAGE_SIZE, parsePage } from "@/components/admin/pager";
import { PaymentActions } from "./payment-actions";

export const metadata = { title: "Payments — Admin" };

const fmt = (iso: string | null) => (iso ? new Date(/[TZ]/.test(iso) ? iso : iso.replace(" ", "T") + "Z").toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; method?: string; email?: string }> }) {
  await requirePageRole(["ADMIN"], "/admin");
  expireStalePending();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const status = (PAYMENT_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as PaymentStatus) : undefined;
  const method = (PAYMENT_METHODS as readonly string[]).includes(sp.method ?? "") ? (sp.method as PaymentMethod) : undefined;
  const email = sp.email?.trim().slice(0, 100) || undefined;
  const { rows, total } = listTransactionsForAdmin({ page, pageSize: PAGE_SIZE, status, method, email });

  const providers = getProviders();
  const accounts = db.select().from(paymentAccounts).where(eq(paymentAccounts.active, true)).all();
  const base = appBaseUrl();
  const toCheck = listTransactionsForAdmin({ page: 1, pageSize: 1, status: "PROCESSING" }).total;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Payments</h1>
      <p className="mt-1 text-sm text-ink-soft">Check payments students report, and refund when needed. A plan is only switched on after you approve or a gateway confirms.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 text-sm" data-testid="provider-status">
          <p className="font-medium text-ink">Ways to pay</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-ink-soft">
            <li>
              Manual accounts: <strong className="text-ink">{accounts.length}</strong> active ({[...new Set(accounts.map((a) => METHOD_LABELS[a.method]))].join(", ") || "none"}). Edit them under Payment accounts.
            </li>
            <li>
              Card payments (SSLCommerz):{" "}
              <strong className="text-ink">{providers.find((p) => p.code === "sslcommerz")?.isConfigured() ? "configured" : "not configured"}</strong>
            </li>
            <li>
              Signed callback: <strong className="text-ink">{providers.find((p) => p.code === "signed")?.isConfigured() ? "configured" : "not configured"}</strong>
            </li>
          </ul>
        </Card>
        <Card className="p-4 text-sm lg:col-span-2">
          <p className="font-medium text-ink">Callback addresses for your payment provider</p>
          <ul className="mt-2 flex flex-col gap-1 break-all font-mono text-xs text-ink-soft">
            <li>Signed events: {base}/api/webhooks/payments/signed</li>
            <li>SSLCommerz IPN: {base}/api/webhooks/payments/sslcommerz</li>
          </ul>
          <p className="mt-2 text-xs text-ink-soft">Set PAYMENT_WEBHOOK_SECRET (16+ characters), SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD in the environment. See the README for the callback format.</p>
        </Card>
      </div>

      <form className="mt-6 flex flex-wrap gap-2" role="search">
        <input name="email" defaultValue={email} placeholder="Search by email" aria-label="Search by email" className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
        <select name="status" defaultValue={status ?? ""} aria-label="Status" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
          <option value="">All statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select name="method" defaultValue={method ?? ""} aria-label="Method" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {METHOD_LABELS[m]}
            </option>
          ))}
        </select>
        <button className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-primary-soft">Filter</button>
      </form>
      {toCheck > 0 && !status && (
        <p className="mt-3 text-sm text-primary" data-testid="to-check">
          {toCheck} payment{toCheck === 1 ? "" : "s"} waiting for your check.
        </p>
      )}

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full min-w-[56rem] text-sm" data-testid="payments-table">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3 font-medium">Receipt</th>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Transaction ID</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-ink-soft">
                  No payments found.
                </td>
              </tr>
            )}
            {rows.map(({ tx, plan, userName, userEmail }) => (
              <tr key={tx.id} className="border-b border-border align-top last:border-0" data-testid={`payment-${tx.id}`}>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs text-ink">{receiptNumber(tx)}</p>
                  <p className="text-xs text-ink-soft">{fmt(tx.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-ink">{userName}</p>
                  <p className="text-xs text-ink-soft">{userEmail}</p>
                </td>
                <td className="px-4 py-3 text-ink">
                  {plan.name}
                  <span className="block text-xs text-ink-soft">{tx.period === "YEARLY" ? "1 year" : "1 month"}</span>
                </td>
                <td className="px-4 py-3 text-ink">
                  {formatTaka(tx.amount)}
                  {tx.discountAmount > 0 && <span className="block text-xs text-success">{tx.couponCode} −{formatTaka(tx.discountAmount)}</span>}
                </td>
                <td className="px-4 py-3 text-ink-soft">{METHOD_LABELS[tx.method]}</td>
                <td className="px-4 py-3">
                  <p className="font-mono text-xs text-ink">{tx.providerReference ?? "—"}</p>
                  {tx.senderNumber && <p className="text-xs text-ink-soft">from {tx.senderNumber}</p>}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONES[tx.status]}>{STATUS_LABELS[tx.status]}</Badge>
                  {tx.failureReason && <p className="mt-1 max-w-[14rem] text-xs text-ink-soft">{tx.failureReason}</p>}
                  {tx.refundReason && <p className="mt-1 max-w-[14rem] text-xs text-ink-soft">{tx.refundReason}</p>}
                </td>
                <td className="px-4 py-3">
                  <PaymentActions id={tx.id} status={tx.status} amount={formatTaka(tx.amount)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Pager basePath="/admin/payments" page={page} total={total} params={{ status, method, email }} />
    </div>
  );
}

import { requirePageRole } from "@/lib/security/guards";
import { listPlans, listSubscriptionsForAdmin } from "@/lib/services/plans";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pager, PAGE_SIZE, parsePage } from "@/components/admin/pager";
import { GrantForm, SubscriptionActions } from "./subscription-controls";

export const metadata = { title: "Subscriptions — Admin" };

const TONE = { ACTIVE: "success", EXPIRED: "neutral", CANCELLED: "danger" } as const;
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<{ page?: string; email?: string; status?: string }> }) {
  await requirePageRole(["ADMIN"], "/admin");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const email = sp.email?.trim().slice(0, 100) || undefined;
  const status = sp.status === "ACTIVE" || sp.status === "EXPIRED" || sp.status === "CANCELLED" ? sp.status : undefined;

  const { rows, total } = listSubscriptionsForAdmin({ page, pageSize: PAGE_SIZE, email, status });
  const paidPlans = listPlans().filter((p) => p.rank > 0);
  const now = Date.now();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Subscriptions</h1>
      <p className="mt-1 text-sm text-ink-soft">Every paid plan a student has had. Plans end automatically when their period is over.</p>

      <Card className="mt-6 max-w-2xl p-5">
        <h2 className="font-display text-lg text-ink">Give a student a plan</h2>
        <p className="mt-1 text-xs text-ink-soft">For scholarships, support fixes, or payments you have checked by hand. The student is notified by email and in the app.</p>
        <GrantForm plans={paidPlans.map((p) => ({ code: p.code, name: p.name }))} />
      </Card>

      <form className="mt-6 flex flex-wrap gap-2" role="search">
        <input name="email" defaultValue={email} placeholder="Search by email" aria-label="Search by email" className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
        <select name="status" defaultValue={status ?? ""} aria-label="Status" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-primary-soft">Filter</button>
      </form>

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full text-sm" data-testid="subscriptions-table">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium">Ends</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-soft">
                  No subscriptions found.
                </td>
              </tr>
            )}
            {rows.map(({ sub, plan, userName, userEmail }) => {
              const live = sub.status === "ACTIVE" && new Date(sub.currentPeriodEnd).getTime() > now;
              return (
                <tr key={sub.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-ink">{userName}</p>
                    <p className="text-xs text-ink-soft">{userEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-ink">{plan.name}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TONE[sub.status]}>{sub.status === "ACTIVE" && !live ? "Ended" : sub.status.toLowerCase()}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{fmt(sub.startedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{fmt(sub.currentPeriodEnd)}</td>
                  <td className="px-4 py-3 text-xs text-ink-soft">{sub.source.toLowerCase()}</td>
                  <td className="px-4 py-3">{live && <SubscriptionActions id={sub.id} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Pager basePath="/admin/subscriptions" page={page} total={total} params={{ email, status }} />
    </div>
  );
}

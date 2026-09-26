import { requirePageRole } from "@/lib/security/guards";
import { referralLeaders } from "@/lib/services/referrals";
import { REFERRAL_MAX_REWARDS, REFERRAL_REWARD_DAYS } from "@/lib/growth/rules";
import { Card } from "@/components/ui/card";

export const metadata = { title: "Referrals — Admin" };

export default async function AdminReferralsPage() {
  await requirePageRole(["ADMIN"], "/admin");
  const rows = referralLeaders();

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Referrals</h1>
        <p className="mt-1 text-sm text-ink-soft">
          A friend&apos;s first paid purchase gives the referrer {REFERRAL_REWARD_DAYS} free days (up to {REFERRAL_MAX_REWARDS} rewards each). Purchases with a 100% coupon don&apos;t count, and nobody can refer themselves. Look here for unusual patterns, such as many sign-ups and no purchases.
        </p>
      </div>
      {rows.length === 0 ? (
        <Card className="p-5 text-sm text-ink-soft">Nobody has used a referral link yet.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm" data-testid="referral-table">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Clicks</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Purchases</th>
                <th className="px-4 py-3 font-medium">Days given</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{r.name}</p>
                    <p className="text-xs text-ink-soft">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">{r.code}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.clicks}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.registrations}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.purchases}</td>
                  <td className="px-4 py-3 text-ink-soft">{r.rewardDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

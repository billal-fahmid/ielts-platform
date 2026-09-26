import { Gift, MousePointerClick, ShoppingBag, UserPlus } from "lucide-react";
import { auth } from "@/lib/auth";
import { getOrCreateCode, referralStats } from "@/lib/services/referrals";
import { REFERRAL_MAX_REWARDS, REFERRAL_REWARD_DAYS } from "@/lib/growth/rules";
import { timeAgo } from "@/lib/notifications/types";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/teacher/stat";
import { CopyButton } from "@/components/growth/controls";

export const metadata = { title: "Refer a friend — BanglaEnglish" };

export default async function ReferralsPage() {
  const session = await auth();
  const user = session!.user as any;
  const code = getOrCreateCode(user.id);
  const base = (process.env.APP_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const link = `${base}/r/${code}`;
  const s = referralStats(user.id);
  const isStudent = user.role === "STUDENT";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Refer a friend</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {isStudent ? `Share your link. When a friend joins and makes their first paid purchase, you get ${REFERRAL_REWARD_DAYS} free days of your plan.` : "Share your link to bring friends to BanglaEnglish. As a teacher you already have full access, so there are no plan days to earn."}
        </p>
      </div>

      <Card className="flex flex-col gap-3 p-5" data-testid="referral-link">
        <p className="text-sm font-medium text-ink">Your link</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-lg bg-primary-soft/50 px-3 py-2 text-sm text-ink">{link}</code>
          <CopyButton text={link} label="Copy link" />
        </div>
        <p className="text-xs text-ink-soft">
          Or give them your code: <span className="font-mono font-semibold text-ink">{code}</span>. Links are counted once per visitor per day, and you can&apos;t refer yourself.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Link clicks" value={s.clicks} testId="ref-clicks" />
        <Stat label="Friends joined" value={s.registrations} testId="ref-joined" />
        <Stat label="First purchases" value={s.purchases} testId="ref-purchases" />
        <Stat label="Free days earned" value={s.rewardDays} hint={isStudent ? `${s.rewardsLeft} of ${REFERRAL_MAX_REWARDS} rewards left` : undefined} testId="ref-days" />
      </div>

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-ink">
          <Gift className="h-4.5 w-4.5 text-primary" /> How it works
        </h2>
        <ol className="mt-3 flex flex-col gap-2.5 text-sm text-ink-soft">
          <li className="flex gap-2.5">
            <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Your friend opens your link and creates an account.
          </li>
          <li className="flex gap-2.5">
            <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> They&apos;re linked to you. You get a notification.
          </li>
          <li className="flex gap-2.5">
            <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> When their first paid purchase is confirmed, {isStudent ? `you get ${REFERRAL_REWARD_DAYS} free days added to your plan.` : "the referral is recorded."} Purchases with a 100% coupon don&apos;t count.
          </li>
        </ol>
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Recent activity</h2>
        {s.recent.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Nobody has joined through your link yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border" data-testid="ref-recent">
            {s.recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="text-ink">
                  {r.who} {r.type === "PURCHASE" ? "made their first purchase" : "joined"}
                  {r.type === "PURCHASE" && r.rewardDays > 0 && <span className="ml-1 text-success">· you earned {r.rewardDays} days</span>}
                </span>
                <span className="text-xs text-ink-soft">{timeAgo(r.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

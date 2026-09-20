import Link from "next/link";
import { Check, Minus, Gauge, CalendarClock } from "lucide-react";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { getEntitlements, listPlans, listUserSubscriptions, quizAttemptsToday, vocabularyWordsToday } from "@/lib/services/plans";
import { PLAN_FEATURES, FEATURE_LABELS, formatTaka } from "@/lib/plans/features";
import { checkoutHref } from "@/lib/plans/checkout";

export const metadata = { title: "My plan — BanglaEnglish" };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const TONE = { ACTIVE: "success", EXPIRED: "neutral", CANCELLED: "danger" } as const;

export default async function BillingPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const ent = getEntitlements(userId);
  const all = listPlans({ onlyPublished: true });
  const upgrades = all.filter((p) => p.rank > ent.plan.rank);
  const history = listUserSubscriptions(userId);
  const daysLeft = ent.subscription ? Math.max(0, Math.ceil((new Date(ent.subscription.currentPeriodEnd).getTime() - Date.now()) / 86_400_000)) : null;

  const vocabUsed = vocabularyWordsToday(userId).length;
  const quizUsed = quizAttemptsToday(userId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">My plan</h1>
        <p className="mt-1 text-sm text-ink-soft">What you can use now, and how to get more.</p>
      </div>

      <Card className="flex flex-col gap-4 p-6" data-testid="current-plan">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-soft">Current plan</p>
            <h2 className="font-display text-2xl text-ink">{ent.staff ? "Full access (staff)" : ent.plan.name}</h2>
          </div>
          {ent.subscription && (
            <Badge tone="success">
              <CalendarClock className="h-3 w-3" /> Until {fmt(ent.subscription.currentPeriodEnd)}
              {daysLeft !== null && daysLeft <= 7 ? ` · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : ""}
            </Badge>
          )}
        </div>
        <p className="text-sm text-ink-soft">{ent.staff ? "Teacher and admin accounts can open every feature." : ent.plan.description}</p>

        {!ent.staff && (ent.plan.vocabPerDay !== null || ent.plan.quizzesPerDay !== null) && (
          <div className="flex flex-col gap-1.5 rounded-lg bg-accent-soft p-3 text-sm text-ink" data-testid="usage">
            <p className="flex items-center gap-2 font-medium">
              <Gauge className="h-4 w-4" /> Today&apos;s usage
            </p>
            {ent.plan.vocabPerDay !== null && (
              <p>
                New vocabulary words: {vocabUsed} of {ent.plan.vocabPerDay}
              </p>
            )}
            {ent.plan.quizzesPerDay !== null && (
              <p>
                Quizzes: {quizUsed} of {ent.plan.quizzesPerDay}
              </p>
            )}
            <p className="text-xs text-ink-soft">Limits reset at midnight, Bangladesh time.</p>
          </div>
        )}

        <ul className="grid gap-2 sm:grid-cols-2">
          {PLAN_FEATURES.map((f) => {
            const has = ent.features.has(f);
            return (
              <li key={f} className={`flex items-start gap-2 text-sm ${has ? "text-ink" : "text-ink-soft"}`}>
                {has ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : <Minus className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft/50" />}
                {FEATURE_LABELS[f]}
              </li>
            );
          })}
        </ul>
      </Card>

      {upgrades.length > 0 && !ent.staff && (
        <section aria-labelledby="upgrade-heading">
          <h2 id="upgrade-heading" className="font-display text-lg text-ink">
            Upgrade
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {upgrades.map((p) => (
              <Card key={p.code} className="flex flex-col gap-2 p-5" data-testid={`upgrade-${p.code}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg text-ink">{p.name}</h3>
                  {p.highlighted && <Badge tone="primary">Most popular</Badge>}
                </div>
                <p className="text-sm text-ink-soft">{p.description}</p>
                <p className="font-display text-xl text-ink">
                  {formatTaka(p.priceMonthly)} <span className="text-sm font-normal text-ink-soft">/ month</span>
                </p>
                <LinkButton href={checkoutHref(p.code)} size="sm" className="mt-1 self-start">
                  Upgrade to {p.name}
                </LinkButton>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Not sure which plan? <Link href="/pricing" className="text-primary underline">Compare all plans</Link>.
          </p>
        </section>
      )}

      {history.length > 0 && (
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="font-display text-lg text-ink">
            Plan history
          </h2>
          <Card className="mt-3 overflow-x-auto p-0">
            <table className="w-full text-sm" data-testid="plan-history">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Ends</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map(({ sub, plan }) => (
                  <tr key={sub.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-ink">{plan.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{fmt(sub.startedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{fmt(sub.currentPeriodEnd)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={TONE[sub.status]}>{sub.status.toLowerCase()}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </div>
  );
}

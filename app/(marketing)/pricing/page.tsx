import { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { getEntitlements, listPlans } from "@/lib/services/plans";
import { PLAN_FEATURES, FEATURE_LABELS } from "@/lib/plans/features";
import { PricingCards } from "@/components/plans/pricing-cards";

export const metadata: Metadata = {
  title: "Pricing — BanglaEnglish",
  description: "Start free and upgrade when you're ready. English courses, IELTS practice, AI feedback, live classes and teacher review, priced in Bangladeshi taka.",
};

export default async function PricingPage() {
  const plans = listPlans({ onlyPublished: true });
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  const ent = userId ? getEntitlements(userId) : null;

  const limit = (n: number | null | undefined) => (n === null || n === undefined ? "Unlimited" : `${n} a day`);

  return (
    <div>
      <section className="border-b border-border bg-surface py-16">
        <div className="container-page mx-auto max-w-xl text-center">
          <p className="text-sm font-medium text-primary">Pricing</p>
          <h1 className="mt-1.5 font-display text-3xl text-ink sm:text-4xl">Start free, upgrade when you&apos;re ready</h1>
          <p className="mt-4 text-base text-ink-soft">No card needed to start. Paid plans don&apos;t renew by themselves: you pay only for the period you choose.</p>
        </div>
      </section>

      <section className="container-page py-14">
        <PricingCards
          plans={plans.map((p) => ({ code: p.code, name: p.name, description: p.description, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly, bullets: p.bullets as string[], rank: p.rank, highlighted: p.highlighted }))}
          currentRank={ent && !ent.staff ? ent.plan.rank : null}
          currentCode={ent && !ent.staff ? ent.plan.code : null}
        />
      </section>

      <section className="container-page pb-16">
        <h2 className="font-display text-2xl text-ink">Compare plans</h2>
        <Card className="mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[36rem] text-sm" data-testid="compare-table">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-medium text-ink-soft">What you get</th>
                {plans.map((p) => (
                  <th key={p.code} className="px-4 py-3 text-center font-display text-base text-ink">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-ink">New vocabulary words</td>
                {plans.map((p) => (
                  <td key={p.code} className="px-4 py-3 text-center text-ink-soft">
                    {limit(p.vocabPerDay)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border">
                <td className="px-4 py-3 text-ink">Quizzes</td>
                {plans.map((p) => (
                  <td key={p.code} className="px-4 py-3 text-center text-ink-soft">
                    {limit(p.quizzesPerDay)}
                  </td>
                ))}
              </tr>
              {PLAN_FEATURES.map((f) => (
                <tr key={f} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-ink">{FEATURE_LABELS[f]}</td>
                  {plans.map((p) => (
                    <td key={p.code} className="px-4 py-3 text-center">
                      {(p.features as string[]).includes(f) ? <Check className="mx-auto h-4 w-4 text-success" aria-label="Included" /> : <Minus className="mx-auto h-4 w-4 text-ink-soft/50" aria-label="Not included" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="mt-4 text-xs text-ink-soft">All prices are in Bangladeshi taka. Practice bands are AI or calculated estimates, never official IELTS scores.</p>
      </section>
    </div>
  );
}

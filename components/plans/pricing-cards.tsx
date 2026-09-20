"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatTaka } from "@/lib/plans/features";
import { checkoutHref } from "@/lib/plans/checkout";

export type PricingPlan = {
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number | null;
  bullets: string[];
  rank: number;
  highlighted: boolean;
};

/** The plan cards, with a monthly / yearly switch. `currentRank` is null when the visitor is signed out. */
export function PricingCards({ plans, currentRank, currentCode }: { plans: PricingPlan[]; currentRank: number | null; currentCode: string | null }) {
  const anyYearly = plans.some((p) => p.priceYearly !== null && p.priceYearly > 0);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  return (
    <div>
      {anyYearly && (
        <div role="group" aria-label="Billing period" className="mx-auto flex w-fit rounded-full border border-border bg-surface p-1 text-sm">
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className={cn("rounded-full px-4 py-1.5 font-medium capitalize", period === p ? "bg-primary text-white" : "text-ink-soft hover:text-ink")}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4" data-testid="pricing-cards">
        {plans.map((plan) => {
          const yearly = period === "yearly" && plan.priceYearly !== null && plan.priceYearly > 0;
          const price = yearly ? plan.priceYearly! : plan.priceMonthly;
          const saving = plan.priceYearly && plan.priceMonthly > 0 && plan.priceYearly < plan.priceMonthly * 12 ? Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100) : 0;
          const isCurrent = currentCode === plan.code;
          const isLower = currentRank !== null && plan.rank < currentRank;

          let cta: React.ReactNode;
          if (currentRank === null) {
            cta = (
              <Link href="/register" className={cn("block rounded-full px-4 py-2.5 text-center text-sm font-medium", plan.highlighted ? "bg-primary text-white hover:bg-primary-dark" : "border border-border text-ink hover:bg-primary-soft")}>
                {plan.priceMonthly === 0 ? "Start free" : `Get ${plan.name}`}
              </Link>
            );
          } else if (isCurrent) {
            cta = <span className="block rounded-full border border-border px-4 py-2.5 text-center text-sm font-medium text-ink-soft">Your current plan</span>;
          } else if (isLower) {
            cta = <span className="block px-4 py-2.5 text-center text-xs text-ink-soft">Included in your plan</span>;
          } else {
            cta = (
              <Link href={checkoutHref(plan.code, yearly ? "yearly" : "monthly")} className={cn("block rounded-full px-4 py-2.5 text-center text-sm font-medium", plan.highlighted ? "bg-primary text-white hover:bg-primary-dark" : "border border-border text-ink hover:bg-primary-soft")}>
                Upgrade to {plan.name}
              </Link>
            );
          }

          return (
            <Card key={plan.code} className={cn("flex flex-col gap-4 p-6", plan.highlighted && "border-primary ring-1 ring-primary/30")} data-testid={`plan-${plan.code}`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl text-ink">{plan.name}</h2>
                {plan.highlighted && <Badge tone="primary">Most popular</Badge>}
              </div>
              <p className="min-h-10 text-sm text-ink-soft">{plan.description}</p>
              <div>
                <p className="font-display text-3xl text-ink">
                  {price === 0 ? "৳0" : formatTaka(price)}
                  <span className="ml-1 text-sm font-normal text-ink-soft">{price === 0 ? "forever" : yearly ? "/ year" : "/ month"}</span>
                </p>
                <p className="mt-1 h-4 text-xs text-success">{yearly && saving > 0 ? `Save ${saving}% compared with monthly` : ""}</p>
              </div>
              <ul className="flex flex-1 flex-col gap-2 text-sm text-ink">
                {plan.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {b}
                  </li>
                ))}
              </ul>
              {cta}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

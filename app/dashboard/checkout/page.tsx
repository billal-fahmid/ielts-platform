import Link from "next/link";
import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { getEntitlements, getPlanByCode } from "@/lib/services/plans";
import { availableMethods, quoteCheckout } from "@/lib/services/payments";
import { listPrice } from "@/lib/payments/pricing";
import { CheckoutForm } from "@/components/payments/checkout-form";

export const metadata = { title: "Checkout — BanglaEnglish" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string; period?: string; course?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const userId = (session!.user as any).id;

  const plan = sp.plan ? getPlanByCode(sp.plan.toUpperCase().slice(0, 20)) : undefined;
  const requested = sp.period === "yearly" ? "YEARLY" : "MONTHLY";
  const ent = getEntitlements(userId);

  const problem = !plan || plan.rank <= 0 || !plan.published ? "We couldn't find that plan." : ent.staff ? "Teacher and admin accounts already have full access." : null;
  if (problem || !plan) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <Card className="flex flex-col items-start gap-3 p-6">
          <h1 className="font-display text-xl text-ink">{problem}</h1>
          <LinkButton href="/pricing">See the plans</LinkButton>
        </Card>
      </div>
    );
  }

  const monthlyAvailable = listPrice(plan, "MONTHLY") !== null;
  const yearlyAvailable = listPrice(plan, "YEARLY") !== null;
  const period = requested === "YEARLY" && yearlyAvailable ? "YEARLY" : monthlyAvailable ? "MONTHLY" : "YEARLY";

  // A plan below the student's own can't be bought: say so instead of showing a form that will fail.
  const check = quoteCheckout({ userId, planCode: plan.code, period });
  if (!check.ok) {
    return (
      <div className="mx-auto max-w-xl py-8">
        <Card className="flex flex-col items-start gap-3 p-6">
          <h1 className="font-display text-xl text-ink">{check.error}</h1>
          <LinkButton href="/dashboard/billing">Back to my plan</LinkButton>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard/billing" className="text-sm text-ink-soft hover:text-ink">
        ← My plan
      </Link>
      <h1 className="mt-3 font-display text-2xl text-ink">Upgrade to {plan.name}</h1>
      <p className="mt-1 text-sm text-ink-soft">{plan.description}</p>
      <div className="mt-6">
        <CheckoutForm
          plan={{ code: plan.code, name: plan.name }}
          monthlyAvailable={monthlyAvailable}
          yearlyAvailable={yearlyAvailable}
          period={period}
          methods={availableMethods().map((m) => ({ method: m.method, label: m.label }))}
          courseId={sp.course?.slice(0, 64)}
          currentPlanName={ent.plan.name}
        />
      </div>
    </div>
  );
}

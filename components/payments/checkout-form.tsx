"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatTaka } from "@/lib/plans/features";

type Method = { method: string; label: string };
type Quote = { total: number; baseAmount: number; discount: number; days: number; renewal: boolean; coupon: { code: string; description: string | null } | null };

export function CheckoutForm({
  plan,
  yearlyAvailable,
  monthlyAvailable,
  period,
  methods,
  courseId,
  currentPlanName,
}: {
  plan: { code: string; name: string };
  monthlyAvailable: boolean;
  yearlyAvailable: boolean;
  period: "MONTHLY" | "YEARLY";
  methods: Method[];
  courseId?: string;
  currentPlanName: string;
}) {
  const router = useRouter();
  const [chosenPeriod, setChosenPeriod] = useState(period);
  const [couponInput, setCouponInput] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [method, setMethod] = useState(methods[0]?.method ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-price whenever the period or the applied coupon changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/payments/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: plan.code, period: chosenPeriod, couponCode: couponCode || undefined, courseId }),
      }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (cancelled) return;
      if (res?.ok) {
        setQuote(data);
        setQuoteError(null);
      } else if (couponCode) {
        // The coupon was the problem: drop it and say why.
        setCouponError(data?.error ?? "That coupon can't be used.");
        setCouponCode("");
      } else {
        setQuote(null);
        setQuoteError(data?.error ?? "We couldn't price this plan.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan.code, chosenPeriod, couponCode, courseId]);

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    if (couponInput.trim()) setCouponCode(couponInput.trim());
  };

  const free = quote?.total === 0;

  const pay = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode: plan.code, period: chosenPeriod, method: free ? "COUPON" : method, couponCode: couponCode || undefined, courseId }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      setError(data?.error ?? "We couldn't start your payment. Please try again.");
      return;
    }
    if (data.redirectUrl) {
      window.location.href = data.redirectUrl; // the card payment page
      return;
    }
    router.push(`/dashboard/billing/payments/${data.transactionId}`);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div className="flex flex-col gap-6">
        {(monthlyAvailable && yearlyAvailable) && (
          <Card className="p-5">
            <h2 className="font-display text-lg text-ink">Billing period</h2>
            <div role="radiogroup" aria-label="Billing period" className="mt-3 flex flex-wrap gap-2">
              {([["MONTHLY", "1 month"], ["YEARLY", "1 year"]] as const).map(([p, label]) => (
                <button key={p} type="button" role="radio" aria-checked={chosenPeriod === p} onClick={() => setChosenPeriod(p)} className={cn("rounded-full border px-4 py-2 text-sm font-medium", chosenPeriod === p ? "border-primary bg-primary text-white" : "border-border text-ink hover:bg-primary-soft")}>
                  {label}
                </button>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="font-display text-lg text-ink">Coupon</h2>
          {quote?.coupon ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-success-soft px-3 py-2 text-sm text-success" data-testid="coupon-applied">
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4" /> {quote.coupon.code} applied{quote.coupon.description ? `: ${quote.coupon.description}` : ""}
              </span>
              <button type="button" onClick={() => { setCouponCode(""); setCouponInput(""); setCouponError(null); }} aria-label="Remove coupon" className="rounded p-1 hover:bg-success/10">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={applyCoupon} className="mt-3 flex gap-2">
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} aria-label="Coupon code" placeholder="Have a coupon? e.g. IELTS20" maxLength={40} className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm uppercase text-ink outline-none placeholder:normal-case focus:border-primary" />
              <Button type="submit" variant="outline">
                Apply
              </Button>
            </form>
          )}
          {couponError && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {couponError}
            </p>
          )}
        </Card>

        {!free && (
          <Card className="p-5">
            <h2 className="font-display text-lg text-ink">How would you like to pay?</h2>
            {methods.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft" data-testid="no-methods">
                Online payment isn&apos;t set up yet.{" "}
                <Link href={`/contact?plan=${plan.code}`} className="text-primary underline">
                  Contact us
                </Link>{" "}
                and we&apos;ll help you upgrade.
              </p>
            ) : (
              <div role="radiogroup" aria-label="Payment method" className="mt-3 grid gap-2 sm:grid-cols-2">
                {methods.map((m) => (
                  <button key={m.method} type="button" role="radio" aria-checked={method === m.method} onClick={() => setMethod(m.method)} className={cn("flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium", method === m.method ? "border-primary bg-primary-soft text-ink" : "border-border text-ink hover:border-primary/50")}>
                    {m.label}
                    {method === m.method && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <Card className="flex flex-col gap-3 p-5 lg:sticky lg:top-24" data-testid="order-summary">
        <h2 className="font-display text-lg text-ink">Order summary</h2>
        {quoteError && (
          <p role="alert" className="text-sm text-danger">
            {quoteError}
          </p>
        )}
        {quote && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">
                {plan.name} · {chosenPeriod === "YEARLY" ? "1 year" : "1 month"}
              </span>
              <span className="text-ink">{formatTaka(quote.baseAmount)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-sm text-success" data-testid="discount-line">
                <span>Coupon {quote.coupon?.code}</span>
                <span>−{formatTaka(quote.discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 font-medium text-ink" data-testid="order-total">
              <span>Total</span>
              <span>{formatTaka(quote.total)}</span>
            </div>
            <p className="text-xs text-ink-soft">
              {quote.renewal
                ? `Adds ${quote.days} days to your current ${currentPlanName} plan.`
                : currentPlanName === "Free"
                  ? `Access starts as soon as your payment is confirmed, for ${quote.days} days.`
                  : `This replaces your ${currentPlanName} plan as soon as it is confirmed. Time left on it isn't carried over.`}{" "}
              It does not renew by itself.
            </p>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button onClick={pay} loading={busy} disabled={!free && !method} size="lg">
              {free ? "Activate my plan" : "Continue"}
            </Button>
            <Link href="/pricing" className="text-center text-xs text-ink-soft underline hover:text-ink">
              Compare plans
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}

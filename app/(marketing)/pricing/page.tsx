import { Metadata } from "next";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing — BanglaEnglish" };

const plans = [
  {
    name: "Free",
    price: "৳0",
    period: "forever",
    desc: "Get started and find your level.",
    features: ["Placement assessment", "Beginner course access", "5 vocabulary words / day", "Progress tracking"],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "৳499",
    period: "/ month",
    desc: "Full access to every course and tool.",
    features: [
      "All English & IELTS courses",
      "Unlimited vocabulary & flashcards",
      "Full Grammar Lab access",
      "Progress analytics & badges",
      "Priority support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Pro + Coaching",
    price: "৳1,999",
    period: "/ month",
    desc: "Everything in Pro, plus live teacher sessions.",
    features: ["Everything in Pro", "2 live sessions / month", "Essay & speaking feedback", "Custom study plan"],
    cta: "Talk to us",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div>
      <section className="border-b border-border bg-surface py-16">
        <div className="container-page max-w-xl text-center mx-auto">
          <p className="text-sm font-medium text-primary">Pricing</p>
          <h1 className="mt-1.5 font-display text-3xl text-ink sm:text-4xl">
            Start free, upgrade when you're ready
          </h1>
          <p className="mt-4 text-base text-ink-soft">
            No credit card required to get started. Cancel anytime.
          </p>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <Card
              key={p.name}
              className={cn("flex flex-col p-7", p.highlighted && "border-primary ring-1 ring-primary")}
            >
              {p.highlighted && <Badge tone="accent" className="mb-3 w-fit">Most popular</Badge>}
              <h2 className="font-display text-xl text-ink">{p.name}</h2>
              <p className="mt-1 text-sm text-ink-soft">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-3xl text-ink">{p.price}</span>
                <span className="text-sm text-ink-soft">{p.period}</span>
              </div>
              <ul className="mt-6 flex flex-1 flex-col gap-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <LinkButton href="/register" className="mt-7" variant={p.highlighted ? "primary" : "outline"}>
                {p.cta}
              </LinkButton>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

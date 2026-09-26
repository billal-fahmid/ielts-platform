import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listCountries } from "@/lib/services/study-abroad";
import { flagCode } from "@/lib/growth/rules";

export const metadata: Metadata = {
  title: "Study Abroad — BanglaEnglish",
  description: "Guides to studying in Canada, Australia, the UK, the USA, Germany, Malaysia and New Zealand: typical IELTS scores, costs, visas and intakes.",
};

export default function StudyAbroadPage() {
  const countries = listCountries();

  return (
    <div>
      <section className="border-b border-border bg-surface py-16">
        <div className="container-page max-w-2xl">
          <p className="text-sm font-medium text-primary">Study Abroad</p>
          <h1 className="mt-1.5 font-display text-3xl text-ink sm:text-4xl">Where do you want to study?</h1>
          <p className="mt-4 text-base text-ink-soft">
            A plain-language guide to the most popular destinations for Bangladeshi students: what IELTS score you usually need, roughly what it costs, and how the visa works.
          </p>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="countries">
          {countries.map((c) => (
            <Link key={c.id} href={`/study-abroad/${c.slug}`}>
              <Card className="flex h-full flex-col p-6 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-sm font-semibold text-primary" aria-hidden>
                    {flagCode(c.flag) || c.name.slice(0, 2).toUpperCase()}
                  </span>
                  <h2 className="font-display text-xl text-ink">{c.name}</h2>
                </div>
                <p className="mt-3 line-clamp-4 text-sm text-ink-soft">{c.summary}</p>
                {c.ieltsRequirement && (
                  <div className="mt-4">
                    <Badge tone="primary">{c.ieltsMin != null ? `IELTS from about ${c.ieltsMin.toFixed(1)}` : "IELTS required"}</Badge>
                  </div>
                )}
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary">
                  Read the guide <ArrowRight className="h-4 w-4" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
        <p className="mt-10 max-w-2xl text-xs text-ink-soft">
          These guides are general and change often. Fees, visa rules and English-test requirements differ by university and year, so always confirm them on the official immigration website and with the university before you apply.
        </p>
      </section>
    </div>
  );
}

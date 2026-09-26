import { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfile } from "@/lib/services/users";
import { getCountryBySlug } from "@/lib/services/study-abroad";
import { flagCode } from "@/lib/growth/rules";
import { parseLinkLines } from "@/lib/content/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = getCountryBySlug(slug);
  return c ? pageMetadata({ title: `Study in ${c.name} — BanglaEnglish`, description: c.summary, path: `/study-abroad/${c.slug}` }) : { title: "Study Abroad — BanglaEnglish", robots: { index: false } };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-ink-soft">{children}</div>
    </Card>
  );
}

const List = ({ items }: { items: string[] | null }) => (items && items.length ? <ul className="list-disc pl-5">{items.map((i) => <li key={i}>{i}</li>)}</ul> : <span>Not listed yet.</span>);

export default async function CountryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = getCountryBySlug(slug);
  if (!c) notFound();
  const session = await auth();
  const { links: visaLinks } = parseLinkLines(c.visaResources);
  const target = session?.user ? getProfile((session.user as any).id)?.ieltsTarget ?? null : null;

  return (
    <div>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: `Study in ${c.name}: IELTS requirements, universities and visa`, description: c.summary, mainEntityOfPage: absoluteUrl(`/study-abroad/${c.slug}`), publisher: { "@type": "Organization", name: SITE_NAME } }} />
      <section className="border-b border-border bg-surface py-14">
        <div className="container-page max-w-3xl">
          <Link href="/study-abroad" className="text-sm text-ink-soft hover:text-ink">
            ← All destinations
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-base font-semibold text-primary" aria-hidden>
              {flagCode(c.flag) || c.name.slice(0, 2).toUpperCase()}
            </span>
            <h1 className="font-display text-3xl text-ink sm:text-4xl">Study in {c.name}</h1>
          </div>
          <p className="mt-4 text-base text-ink-soft">{c.summary}</p>
          {c.ieltsMin != null && (
            <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="ielts-fit">
              <Badge tone="primary">Usual minimum: IELTS {c.ieltsMin.toFixed(1)}</Badge>
              {target != null && (
                <Badge tone={target >= c.ieltsMin ? "success" : "accent"}>{target >= c.ieltsMin ? `Your target Band ${target} meets this` : `Your target Band ${target} is below this: consider aiming higher`}</Badge>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="container-page max-w-3xl py-12">
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Section title="Tuition (approximate)">{c.tuitionRange || "Not listed yet."}</Section>
            <Section title="Living costs (approximate)">{c.livingCost || "Not listed yet."}</Section>
          </div>
          <Section title="IELTS requirements">{c.ieltsRequirement || "Check the university you are applying to."}</Section>
          <Section title="General English requirements">{c.englishRequirements || "Check the university you are applying to."}</Section>
          <Section title="Example universities">
            <List items={c.universities} />
            <p className="mt-3 text-xs">These are examples to start your research, not a ranking or a recommendation. Check that a course fits you and that the university is recognised.</p>
          </Section>
          <Section title="Application checklist">
            {c.applicationChecklist && c.applicationChecklist.length ? (
              <ol className="list-decimal pl-5" data-testid="checklist">
                {c.applicationChecklist.map((step) => (
                  <li key={step} className="py-0.5">
                    {step}
                  </li>
                ))}
              </ol>
            ) : (
              <span>Not listed yet.</span>
            )}
          </Section>
          <Section title="Student visa">
            {c.visaInfo || "Check the official immigration website."}
            {visaLinks.length > 0 && (
              <ul className="mt-3 list-disc pl-5" data-testid="visa-resources">
                {visaLinks.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Working while studying and after">{c.workRights || "Check the official immigration website."}</Section>
          <div className="grid gap-5 sm:grid-cols-3">
            <Section title="Intakes">
              <List items={c.intakes} />
            </Section>
            <Section title="Popular cities">
              <List items={c.popularCities} />
            </Section>
            <Section title="Scholarships">
              <List items={c.scholarships} />
            </Section>
          </div>
          <Card className="flex flex-wrap items-center justify-between gap-4 bg-primary-soft/40 p-6">
            <div>
              <h2 className="font-display text-lg text-ink">Ready to reach your band?</h2>
              <p className="mt-1 text-sm text-ink-soft">Take a free placement test, then follow a study plan built around your target.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkButton href="/register">Start free</LinkButton>
              <LinkButton href="/ielts-preparation" variant="outline">
                IELTS preparation
              </LinkButton>
            </div>
          </Card>
          <p className="text-xs text-ink-soft">This is a general guide, not immigration or admissions advice. Fees, visa rules and test requirements change and differ by university, so confirm them on the official immigration website and with the university.</p>
        </div>
      </section>
    </div>
  );
}

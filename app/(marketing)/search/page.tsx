import { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Search as SearchIcon } from "lucide-react";
import { auth } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/lib/security/rate-limit";
import { search, SEARCH_TYPE_LABELS, SEARCH_TYPES, TRACKS, type SearchType } from "@/lib/services/search";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Search — BanglaEnglish", robots: { index: false } };

type Params = { q?: string; type?: string; track?: string; page?: string };

function href(p: Params, change: Partial<Params>) {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...p, ...change })) if (v) next[k] = v;
  return `/search?${new URLSearchParams(next).toString()}`;
}

const TRACK_LABELS: Record<string, string> = { ENGLISH: "English", IELTS: "IELTS", CAREER: "Career" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const session = await auth();
  const user = session?.user ? { id: (session.user as any).id as string, role: ((session.user as any).role ?? "STUDENT") as string } : null;
  const h = await headers();
  const allowed = checkRateLimit("search", clientIp(new Request("http://localhost", { headers: h })), 240, 60).ok;
  const q = (p.q ?? "").slice(0, 100);
  const r = allowed ? search({ q, type: p.type, track: p.track, page: Number(p.page) || 1 }, user) : null;
  const base: Params = { q, type: r?.type ?? "", track: r?.track ?? "" };
  const totalAll = r ? Object.values(r.counts).reduce((a, b) => a + (b ?? 0), 0) : 0;
  const trackRelevant = r && (!r.type || r.type === "COURSE" || r.type === "LESSON");

  const chip = (label: string, active: boolean, to: string, count?: number) => (
    <Link key={label} href={to} className={cn("rounded-full border px-3 py-1 text-xs font-medium", active ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft hover:text-ink")}>
      {label}
      {count !== undefined && <span className="ml-1 opacity-70">{count}</span>}
    </Link>
  );

  return (
    <div>
      <section className="border-b border-border bg-surface py-12">
        <div className="container-page max-w-3xl">
          <h1 className="font-display text-3xl text-ink">Search</h1>
          <form action="/search" role="search" className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input name="q" defaultValue={q} placeholder="Search courses, guides, vocabulary…" aria-label="Search" maxLength={100} className="w-full rounded-lg border border-border bg-bg py-3 pl-9 pr-3.5 text-sm text-ink outline-none focus:border-primary" />
            </div>
            <button className="rounded-lg bg-primary px-5 text-sm font-medium text-white hover:bg-primary-dark">Search</button>
          </form>
        </div>
      </section>

      <section className="container-page max-w-3xl py-10">
        {!allowed ? (
          <p className="text-sm text-ink-soft">Too many searches. Please wait a minute and try again.</p>
        ) : !r || r.terms.length === 0 ? (
          <p className="text-sm text-ink-soft">{q ? "Type at least two letters to search." : "Type a word above to search. Try “IELTS”, “visa”, “grammar” or “interview”."}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2" aria-label="Result types" data-testid="facets">
              {chip("All", !r.type, href(base, { type: "", page: "" }), totalAll)}
              {SEARCH_TYPES.filter((t) => r.allowedTypes.includes(t) && (r.counts[t] ?? 0) > 0).map((t) => chip(SEARCH_TYPE_LABELS[t], r.type === t, href(base, { type: t, page: "" }), r.counts[t]))}
            </div>
            {trackRelevant && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                Course track:
                {chip("Any", !r.track, href(base, { track: "", page: "" }))}
                {TRACKS.map((t) => chip(TRACK_LABELS[t], r.track === t, href(base, { track: t, page: "" })))}
              </div>
            )}

            <p className="mt-5 text-sm text-ink-soft" data-testid="summary">
              {r.total === 0 ? `No results for “${q}”.` : `${r.total} result${r.total === 1 ? "" : "s"} for “${q}”`}
            </p>

            {r.total === 0 ? (
              <Card className="mt-4 p-5 text-sm text-ink-soft">
                Try fewer or different words, or clear a filter.
                {!user && " Sign in to also search lessons, vocabulary, grammar and the community."}
              </Card>
            ) : (
              <ul className="mt-4 flex flex-col gap-3" data-testid="results">
                {r.items.map((it) => (
                  <li key={it.type + it.id}>
                    <Link href={it.url}>
                      <Card className="p-4 transition-colors hover:border-primary/40">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                          <Badge tone="primary">{SEARCH_TYPE_LABELS[it.type as SearchType]}</Badge>
                          <span>{it.meta}</span>
                        </div>
                        <h2 className="mt-1.5 font-display text-lg text-ink">{it.title}</h2>
                        {it.snippet && <p className="mt-1 text-sm text-ink-soft">{it.snippet}</p>}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {r.pages > 1 && (
              <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Pages">
                {r.page > 1 ? (
                  <Link className="text-primary underline" href={href(base, { page: String(r.page - 1) })}>
                    ← Previous
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-ink-soft">
                  Page {r.page} of {r.pages}
                </span>
                {r.page < r.pages ? (
                  <Link className="text-primary underline" href={href(base, { page: String(r.page + 1) })}>
                    Next →
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
            {!user && <p className="mt-8 text-xs text-ink-soft">Searching as a visitor: <Link href="/login" className="text-primary underline">sign in</Link> to also search lessons, vocabulary, grammar and the community.</p>}
          </>
        )}
      </section>
    </div>
  );
}

import { pageMetadata } from "@/lib/seo";
import { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FileText, Headphones, Lock, PlayCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { listResourcesFor, resourceCategories } from "@/lib/services/resources";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({ title: "Resources — BanglaEnglish", description: "Free and premium guides, links, videos and practice material for English and IELTS.", path: "/resources" });

const ICONS = { PDF: FileText, LINK: ExternalLink, VIDEO: PlayCircle, AUDIO: Headphones } as const;
const KIND_LABELS = { PDF: "Document", LINK: "Link", VIDEO: "Video", AUDIO: "Audio" } as const;

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const session = await auth();
  const viewerId = (session?.user as any)?.id ?? null;
  const all = listResourcesFor(viewerId);
  const categories = resourceCategories(all);
  const active = categories.includes(category ?? "") ? category! : null;
  const items = active ? all.filter((r) => r.category === active) : all;

  return (
    <div>
      <section className="border-b border-border bg-surface py-16">
        <div className="container-page max-w-2xl">
          <p className="text-sm font-medium text-primary">Resources</p>
          <h1 className="mt-1.5 font-display text-3xl text-ink sm:text-4xl">Guides and practice material</h1>
          <p className="mt-4 text-base text-ink-soft">Free guides and trusted links, plus practice tools included in paid plans.</p>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="flex flex-wrap gap-2" aria-label="Categories">
          <Link href="/resources" className={cn("rounded-full border px-3 py-1 text-xs font-medium", !active ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft hover:text-ink")}>
            All
          </Link>
          {categories.map((c) => (
            <Link key={c} href={`/resources?category=${encodeURIComponent(c)}`} className={cn("rounded-full border px-3 py-1 text-xs font-medium", active === c ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft hover:text-ink")}>
              {c}
            </Link>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2" data-testid="resources">
          {items.map((r) => {
            const Icon = ICONS[r.kind];
            const external = !!r.url && /^https?:\/\//i.test(r.url);
            return (
              <Card key={r.id} className={cn("flex flex-col gap-2 p-5", r.locked && "bg-primary-soft/20")} data-locked={r.locked || undefined}>
                <div className="flex items-start justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs text-ink-soft">
                    <Icon className="h-4 w-4 text-primary" /> {KIND_LABELS[r.kind]} · {r.category}
                  </span>
                  {r.locked ? (
                    <Badge tone="accent">
                      <Lock className="h-3 w-3" /> {r.requiredPlanName}
                    </Badge>
                  ) : r.requiredPlan === "FREE" ? (
                    <Badge tone="success">Free</Badge>
                  ) : null}
                </div>
                <h2 className="font-display text-lg text-ink">{r.title}</h2>
                <p className="text-sm text-ink-soft">{r.description}</p>
                <div className="mt-auto pt-2">
                  {r.locked ? (
                    <Link href={viewerId ? "/dashboard/billing" : "/pricing"} className="text-sm font-medium text-primary underline">
                      Included in the {r.requiredPlanName} plan{viewerId ? ": see my plan" : ": see pricing"}
                    </Link>
                  ) : (
                    <a href={r.url!} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})} className="text-sm font-medium text-primary underline">
                      Open {external ? "(opens a new tab)" : ""}
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
        {items.length === 0 && <p className="mt-8 text-sm text-ink-soft">No resources in this category yet.</p>}
      </section>
    </div>
  );
}

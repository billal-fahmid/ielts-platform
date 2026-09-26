import Link from "next/link";
import { CheckCircle2, Heart, MessageCircle, Pin, Plus, Search } from "lucide-react";
import { auth } from "@/lib/auth";
import { isBanned, listCategories, listPosts, popularTags } from "@/lib/services/community";
import { KIND_LABELS, SORT_LABELS, SORTS, type Sort } from "@/lib/community/rules";
import { timeAgo } from "@/lib/notifications/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Community — BanglaEnglish" };

type Params = { kind?: string; tag?: string; category?: string; q?: string; sort?: string; page?: string };

function href(current: Params, change: Partial<Params>) {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...current, ...change })) if (v) next[k] = v;
  const qs = new URLSearchParams(next).toString();
  return `/dashboard/community${qs ? `?${qs}` : ""}`;
}

export default async function CommunityPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const session = await auth();
  const user = session!.user as any;
  const sort = (SORTS as string[]).includes(params.sort ?? "") ? (params.sort as Sort) : "latest";
  const feed = listPosts({ id: user.id, role: user.role }, { kind: params.kind, tag: params.tag, category: params.category, q: params.q, sort, page: Number(params.page) || 1 });
  const tags = popularTags();
  const categories = listCategories({ activeOnly: true });
  const restricted = isBanned(user.id);
  const base: Params = { kind: params.kind, tag: params.tag, category: params.category, q: params.q, sort: params.sort };

  const chip = (label: string, active: boolean, to: string) => (
    <Link key={label} href={to} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", active ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft hover:text-ink")}>
      {label}
    </Link>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Community</h1>
          <p className="mt-1 text-sm text-ink-soft">Ask questions, share tips and help other learners. Teachers answer here too.</p>
        </div>
        {!restricted && (
          <LinkButton href="/dashboard/community/new">
            <Plus className="h-4 w-4" /> New post
          </LinkButton>
        )}
      </div>

      {restricted && <Card className="p-4 text-sm text-ink-soft">Your account can read the community but can&apos;t post or comment right now.</Card>}

      <form action="/dashboard/community" className="flex gap-2" role="search">
        {params.kind && <input type="hidden" name="kind" value={params.kind} />}
        {params.tag && <input type="hidden" name="tag" value={params.tag} />}
        {params.category && <input type="hidden" name="category" value={params.category} />}
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search posts" aria-label="Search posts" className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3.5 text-sm text-ink outline-none focus:border-primary" />
        </div>
        <button className="rounded-lg border border-border px-4 text-sm font-medium text-ink hover:bg-primary-soft">Search</button>
      </form>

      <div className="flex flex-wrap gap-2" aria-label="Filters">
        {chip("All", !params.kind, href(base, { kind: "", page: "" }))}
        {chip("Discussions", params.kind === "DISCUSSION", href(base, { kind: "DISCUSSION", page: "" }))}
        {chip("Questions", params.kind === "QUESTION", href(base, { kind: "QUESTION", page: "" }))}
        <span className="mx-1 self-center text-ink-soft/40">|</span>
        {SORTS.map((s) => chip(SORT_LABELS[s], sort === s, href(base, { sort: s === "latest" ? "" : s, page: "" })))}
      </div>
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft" data-testid="categories">
          Topics:
          {chip("All", !params.category, href(base, { category: "", page: "" }))}
          {categories.map((c) => chip(c.name, params.category === c.slug, href(base, { category: params.category === c.slug ? "" : c.slug, page: "" })))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          Tags:
          {tags.map((t) => chip(`#${t.tag}`, params.tag === t.tag, href(base, { tag: params.tag === t.tag ? "" : t.tag, page: "" })))}
        </div>
      )}

      {feed.items.length === 0 ? (
        <EmptyState icon={MessageCircle} title="Nothing here yet" description={params.q || params.tag || params.kind ? "No posts match. Try clearing a filter." : "Be the first to start a conversation."} action={!restricted ? <LinkButton href="/dashboard/community/new">Start a post</LinkButton> : undefined} />
      ) : (
        <div className="flex flex-col gap-3" data-testid="feed">
          {feed.items.map(({ post, author, likes, comments, answered, category }) => (
            <Link key={post.id} href={`/dashboard/community/${post.id}`}>
              <Card className="p-4 transition-colors hover:border-primary/40">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                  {post.pinned && (
                    <Badge tone="accent">
                      <Pin className="h-3 w-3" /> Pinned
                    </Badge>
                  )}
                  <Badge tone={post.kind === "QUESTION" ? "primary" : "neutral"}>{KIND_LABELS[post.kind]}</Badge>
                  {category && <Badge tone="accent">{category.name}</Badge>}
                  {answered && (
                    <Badge tone="success">
                      <CheckCircle2 className="h-3 w-3" /> Answered
                    </Badge>
                  )}
                  <span>
                    {author.name}
                    {author.badge && <span className="ml-1 rounded bg-success-soft px-1.5 py-0.5 text-[10px] font-medium text-success">{author.badge}</span>}
                  </span>
                  <span>· {timeAgo(post.lastActivityAt)}</span>
                </div>
                <h2 className="mt-1.5 font-display text-lg text-ink">{post.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{post.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-soft">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" /> {likes}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" /> {comments}
                  </span>
                  {(post.tags ?? []).map((t) => (
                    <span key={t} className="text-primary">
                      #{t}
                    </span>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {feed.pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Pages">
          {feed.page > 1 ? (
            <Link className="text-primary underline" href={href(base, { page: String(feed.page - 1) })}>
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-soft">
            Page {feed.page} of {feed.pages}
          </span>
          {feed.page < feed.pages ? (
            <Link className="text-primary underline" href={href(base, { page: String(feed.page + 1) })}>
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

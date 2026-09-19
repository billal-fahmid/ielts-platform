import { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listBlogPosts } from "@/lib/services/marketing";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog & Resources — BanglaEnglish" };

export default function BlogPage() {
  const posts = listBlogPosts();

  return (
    <div>
      <section className="border-b border-border bg-surface py-16">
        <div className="container-page max-w-2xl">
          <p className="text-sm font-medium text-primary">Blog & Resources</p>
          <h1 className="mt-1.5 font-display text-3xl text-ink sm:text-4xl">
            Tips, strategy, and study guidance
          </h1>
          <p className="mt-4 text-base text-ink-soft">
            Practical advice from our teachers on grammar, vocabulary, and IELTS strategy.
          </p>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`}>
              <Card className="h-full p-6 transition-shadow hover:shadow-md">
                <Badge tone="primary">{p.category}</Badge>
                <h2 className="mt-3 font-display text-lg text-ink">{p.title}</h2>
                <p className="mt-2 text-sm text-ink-soft line-clamp-3">{p.excerpt}</p>
                <p className="mt-4 text-xs text-ink-soft">{formatDate(p.publishedAt)}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

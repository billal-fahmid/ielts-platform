import { notFound } from "next/navigation";
import Link from "next/link";
import { getBlogPostBySlug } from "@/lib/services/marketing";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return { title: "Article not found — BanglaEnglish", robots: { index: false } };
  return pageMetadata({ title: `${post.title} — BanglaEnglish`, description: post.excerpt || post.content, path: `/blog/${post.slug}`, type: "article", publishedTime: post.publishedAt });
}

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="container-page max-w-2xl py-14">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title, description: post.excerpt || undefined, datePublished: post.publishedAt || undefined, author: { "@type": "Person", name: post.author || SITE_NAME }, publisher: { "@type": "Organization", name: SITE_NAME }, mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`) }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Blog", item: absoluteUrl("/blog") }, { "@type": "ListItem", position: 2, name: post.title, item: absoluteUrl(`/blog/${post.slug}`) }] }} />
      <Link href="/blog" className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Blog
      </Link>
      <Badge tone="primary" className="mt-6">{post.category}</Badge>
      <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">{post.title}</h1>
      <p className="mt-3 text-sm text-ink-soft">{formatDate(post.publishedAt)}</p>
      <div className="prose prose-sm mt-8 max-w-none text-[15px] leading-7 text-ink">
        <p>{post.content}</p>
      </div>
    </article>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { getBlogPostBySlug } from "@/lib/services/marketing";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default async function BlogDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="container-page max-w-2xl py-14">
      <Link href="/blog" className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Blog
      </Link>
      <Badge tone="primary" className="mt-6">{post.category}</Badge>
      <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">{post.title}</h1>
      <p className="mt-3 text-sm text-ink-soft">{formatDate(post.publishedAt)}</p>
      <div className="prose prose-sm mt-8 max-w-none text-[15px] leading-7 text-ink">
        <p>{post.content}</p>
      </div>
    </div>
  );
}

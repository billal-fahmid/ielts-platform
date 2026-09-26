import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
import { listCourses } from "@/lib/services/courses";
import { listBlogPosts } from "@/lib/services/marketing";
import { listCountries } from "@/lib/services/study-abroad";

export const dynamic = "force-dynamic";

const STATIC = ["/", "/courses", "/english-learning", "/ielts-preparation", "/study-abroad", "/resources", "/blog", "/pricing", "/teachers", "/about", "/contact"];

/** Public pages only: published courses, blog posts and countries come from the database. */
export default function sitemap(): MetadataRoute.Sitemap {
  const stamp = (v?: string | null) => (v ? new Date(v.includes("T") ? v : v.replace(" ", "T") + "Z") : undefined);
  return [
    ...STATIC.map((p) => ({ url: absoluteUrl(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.7 })),
    ...listCourses().map((c) => ({ url: absoluteUrl(`/courses/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...listBlogPosts().map((p) => ({ url: absoluteUrl(`/blog/${p.slug}`), lastModified: stamp(p.publishedAt), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...listCountries().map((c) => ({ url: absoluteUrl(`/study-abroad/${c.slug}`), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}

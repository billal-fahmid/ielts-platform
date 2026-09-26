import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Public pages may be crawled; private areas, APIs and share links may not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/teacher", "/dashboard", "/onboarding", "/r/", "/verify/", "/search", "/checkout"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

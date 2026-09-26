import type { Metadata } from "next";
import { appBaseUrl } from "@/lib/payments/urls";

export const SITE_NAME = "BanglaEnglish";
export const SITE_DESCRIPTION = "English learning and IELTS preparation for students in Bangladesh: structured courses, IELTS practice, mock tests, AI feedback and real teachers.";

/** The public address of the site, from APP_URL. */
export const siteUrl = () => appBaseUrl();

/** A full address for a path on this site. */
export const absoluteUrl = (path = "/") => siteUrl() + (path.startsWith("/") ? path : `/${path}`);

/** Trims text to a length that search results show, on a word boundary. */
export function snippet(text: string | null | undefined, max = 155): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

/** Title, description, canonical address and social preview for a public page. */
export function pageMetadata(o: { title: string; description?: string | null; path: string; type?: "website" | "article"; noindex?: boolean; publishedTime?: string | null }): Metadata {
  const description = snippet(o.description) || SITE_DESCRIPTION;
  return {
    title: o.title,
    description,
    alternates: { canonical: o.path },
    openGraph: { title: o.title, description, url: o.path, type: o.type ?? "website", siteName: SITE_NAME, ...(o.publishedTime ? { publishedTime: o.publishedTime } : {}) },
    twitter: { card: "summary", title: o.title, description },
    ...(o.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Public contact details. They come from the environment so no placeholder is ever shown. */
export function contactInfo() {
  return { email: process.env.SUPPORT_EMAIL || "", phone: process.env.SUPPORT_PHONE || "", address: process.env.SUPPORT_ADDRESS || "Mymensingh, Bangladesh" };
}

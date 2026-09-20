import Link from "next/link";
import { SearchX } from "lucide-react";

export const metadata = { title: "Page not found — BanglaEnglish" };

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <SearchX className="h-6 w-6" />
      </span>
      <h1 className="font-display text-2xl text-ink">We can&apos;t find that page</h1>
      <p className="max-w-md text-sm text-ink-soft">The link may be old, or the page may have moved.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="inline-flex items-center rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-dark">
          Go home
        </Link>
        <Link href="/courses" className="inline-flex items-center rounded-full border border-border px-4 py-2.5 text-sm font-medium text-ink hover:bg-primary-soft">
          Browse courses
        </Link>
      </div>
    </div>
  );
}

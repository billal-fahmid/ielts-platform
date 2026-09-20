import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 25;

/** Previous / next links for server-rendered admin lists (?page=2). Keeps other query params. */
export function Pager({ basePath, page, total, params = {} }: { basePath: string; page: number; total: number; params?: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm text-ink-soft">
      <span>
        {total} total · page {page} of {pages}
      </span>
      <span className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 hover:text-ink">
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={href(page + 1)} className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 hover:text-ink">
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
      </span>
    </nav>
  );
}

export function parsePage(value: string | undefined) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

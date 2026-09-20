import Link from "next/link";
import { Gauge } from "lucide-react";

/** For plans with a daily limit: how much is left today. Renders nothing on unlimited plans. */
export function DailyLimitBanner({ what, used, limit }: { what: string; used: number; limit: number | null }) {
  if (limit === null) return null;
  const left = Math.max(0, limit - used);
  return (
    <p className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-accent-soft px-3 py-2 text-xs text-ink" data-testid="daily-limit" role="status">
      <Gauge className="h-3.5 w-3.5 shrink-0" />
      Free plan: {used} of {limit} new {what} used today{left === 0 ? " — the limit resets tomorrow." : "."}
      <Link href="/dashboard/billing" className="font-medium text-primary hover:underline">
        Upgrade for unlimited
      </Link>
    </p>
  );
}

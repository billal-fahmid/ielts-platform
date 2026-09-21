import Link from "next/link";
import { Card } from "@/components/ui/card";

/** One headline number. Becomes a link when `href` is given. */
export function Stat({ label, value, hint, href, testId }: { label: string; value: React.ReactNode; hint?: string; href?: string; testId?: string }) {
  const body = (
    <Card className="p-4 transition-colors hover:border-primary/40" data-testid={testId}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";

export function formatBand(n: number) {
  return n.toFixed(1);
}

/** Headline AI estimate: band, likely range, target comparison and the "not official" label. */
export function BandSummaryCard({
  band,
  low,
  high,
  target,
}: {
  band: number;
  low: number;
  high: number;
  target: number | null;
}) {
  const gap = target !== null ? target - band : null;
  return (
    <Card className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="text-center sm:pr-6 sm:text-left">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">AI estimated band</p>
        <p className="mt-1 font-display text-6xl leading-none text-primary">{formatBand(band)}</p>
        <p className="mt-2 text-sm text-ink">
          Likely range{" "}
          <span className="font-medium">
            {formatBand(low)} – {formatBand(high)}
          </span>
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:border-l sm:border-border sm:pl-6">
        <Badge tone="neutral" className="self-start">
          AI estimate — not an official IELTS score
        </Badge>
        {gap !== null && (
          <p className="text-sm text-ink-soft">
            Your target is <span className="font-medium text-ink">Band {formatBand(target!)}</span>.{" "}
            {gap <= 0
              ? "This response is estimated at or above your target — keep that consistency."
              : `This response is estimated ${formatBand(gap)} below your target, so there's a clear next step below.`}
          </p>
        )}
        <p className="text-xs text-ink-soft">
          Only certified IELTS examiners give official scores. Use this to spot patterns and practise, not to predict your exam result.
        </p>
      </div>
    </Card>
  );
}

export type Criterion = { label: string; score: number; tag?: string };

/** One card per marking criterion, with the weakest flagged as the focus area. */
export function CriteriaGrid({ criteria }: { criteria: Criterion[] }) {
  const lowest = Math.min(...criteria.map((c) => c.score));
  const allEqual = criteria.every((c) => c.score === lowest);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {criteria.map((c) => (
        <Card key={c.label} className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{c.label}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-3xl text-ink">{formatBand(c.score)}</p>
            <div className="flex flex-wrap gap-1">
              {c.tag && <Badge tone="neutral">{c.tag}</Badge>}
              {!allEqual && c.score === lowest && <Badge tone="primary">Focus area</Badge>}
            </div>
          </div>
          <ProgressBar value={(c.score / 9) * 100} className="mt-3" />
        </Card>
      ))}
    </div>
  );
}

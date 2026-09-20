import { checkFeature } from "@/lib/plans/gate";
import { UpgradeWall } from "@/components/plans/upgrade-wall";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { listPublishedPassages, recentReadingAttempts } from "@/lib/services/reading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpenCheck, Clock, FileText } from "lucide-react";

export default async function ReadingListPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const gate = checkFeature(userId, "IELTS_PRACTICE");
  if (!gate.allowed) return <UpgradeWall title="IELTS Reading practice" description="Timed reading passages with every IELTS question type." requiredPlanName={gate.requiredPlanName} currentPlanName={gate.ent.plan.name} />;

  const passages = listPublishedPassages();
  const attempts = recentReadingAttempts(userId, 50); // sorted most-recent-first
  const bandByPassage = new Map<string | null, number | null>();
  for (const a of attempts) {
    if (!bandByPassage.has(a.readingPassageId)) bandByPassage.set(a.readingPassageId, a.bandScore);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">IELTS Reading</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Practice passages in a computer-based test layout, with a timer and an estimated band on submission.
        </p>
      </div>

      {passages.length === 0 ? (
        <EmptyState icon={BookOpenCheck} title="No reading passages published yet" description="Check back soon — new practice passages are added regularly." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {passages.map((p) => {
            const band = bandByPassage.get(p.id);
            return (
              <Link key={p.id} href={`/dashboard/ielts/reading/${p.id}`}>
                <Card className="flex h-full flex-col gap-3 p-5 transition-colors hover:border-primary">
                  <div className="flex items-center justify-between">
                    <Badge tone="neutral">{p.testType === "GENERAL_TRAINING" ? "General Training" : "Academic"}</Badge>
                    {band != null && <Badge tone="primary">Last: Band {band.toFixed(1)}</Badge>}
                  </div>
                  <h2 className="font-display text-lg text-ink">{p.title}</h2>
                  {p.topic && <p className="text-xs text-ink-soft">{p.topic}</p>}
                  <div className="mt-auto flex items-center gap-4 text-xs text-ink-soft">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {Math.round(p.timeLimitSeconds / 60)} min
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" /> {p.wordCount} words
                    </span>
                    <Badge tone="neutral">{p.difficulty}</Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

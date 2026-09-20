import Link from "next/link";
import { auth } from "@/lib/auth";
import { listPublishedTests, getSections, getQuestionsForTest, recentListeningAttempts } from "@/lib/services/listening";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Headphones, Clock, ListChecks } from "lucide-react";

export default async function ListeningListPage() {
  const session = await auth();
  const userId = (session!.user as any).id;

  const tests = listPublishedTests();
  const attempts = recentListeningAttempts(userId, 50); // most-recent-first
  const bandByTest = new Map<string | null, number | null>();
  for (const a of attempts) {
    if (!bandByTest.has(a.listeningTestId)) bandByTest.set(a.listeningTestId, a.bandScore);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">IELTS Listening</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Listen to each recording, answer the questions, and get an estimated band with a full transcript after you submit.
        </p>
      </div>

      {tests.length === 0 ? (
        <EmptyState icon={Headphones} title="No listening tests published yet" description="Check back soon — new practice tests are added regularly." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tests.map((t) => {
            const band = bandByTest.get(t.id);
            const sectionCount = getSections(t.id).length;
            const questionCount = getQuestionsForTest(t.id).length;
            return (
              <Link key={t.id} href={`/dashboard/ielts/listening/${t.id}`}>
                <Card className="flex h-full flex-col gap-3 p-5 transition-colors hover:border-primary">
                  <div className="flex items-center justify-between">
                    <Badge tone="neutral">{sectionCount} sections</Badge>
                    {band != null && <Badge tone="primary">Last: Band {band.toFixed(1)}</Badge>}
                  </div>
                  <h2 className="font-display text-lg text-ink">{t.title}</h2>
                  <div className="mt-auto flex items-center gap-4 text-xs text-ink-soft">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {Math.round(t.timeLimitSeconds / 60)} min
                    </span>
                    <span className="flex items-center gap-1">
                      <ListChecks className="h-3.5 w-3.5" /> {questionCount} questions
                    </span>
                    <Badge tone="neutral">{t.difficulty}</Badge>
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

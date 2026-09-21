import Link from "next/link";
import { PenLine } from "lucide-react";
import { requirePageRole } from "@/lib/security/guards";
import { myReviews, reviewQueue } from "@/lib/services/writing-reviews";
import { formatWhen } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ClaimButton } from "@/components/teacher/review-controls";

export const metadata = { title: "Writing reviews — Teaching" };

const taskLabel = (t: string) => (t === "TASK1" ? "Task 1" : "Task 2");

export default async function TeacherReviewsPage() {
  const user = await requirePageRole(["TEACHER"]);
  const queue = reviewQueue();
  const mine = myReviews(user.id);
  const inProgress = mine.filter((r) => r.status === "IN_REVIEW");
  const done = mine.filter((r) => r.status === "COMPLETED");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Writing reviews</h1>
        <p className="mt-1 text-sm text-ink-soft">Pro students ask a teacher to read their IELTS writing. Pick a request up, then write your band estimate and feedback. The student sees it beside the AI feedback.</p>
      </div>

      {inProgress.length > 0 && (
        <section className="flex flex-col gap-3" data-testid="in-review">
          <h2 className="font-display text-lg text-ink">In progress</h2>
          {inProgress.map((r) => (
            <Link key={r.id} href={`/teacher/reviews/${r.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-primary/40">
                <div>
                  <p className="font-medium text-ink">
                    {r.studentName} · {taskLabel(r.taskType)}
                  </p>
                  <p className="text-xs text-ink-soft">{r.wordCount} words · picked up {formatWhen(r.claimedAt)}</p>
                </div>
                <Badge tone="accent">Write feedback</Badge>
              </Card>
            </Link>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink">Waiting in the queue ({queue.length})</h2>
        {queue.length === 0 ? (
          <EmptyState icon={PenLine} title="The queue is empty" description="New requests from students appear here, oldest first." />
        ) : (
          <div className="flex flex-col gap-3" data-testid="review-queue">
            {queue.map((r) => (
              <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <Link href={`/teacher/reviews/${r.id}`} className="font-medium text-ink hover:text-primary">
                    {r.studentName} · {taskLabel(r.taskType)}
                  </Link>
                  <p className="text-xs text-ink-soft">
                    {r.wordCount} words · target Band {r.targetBand ?? "not set"} · asked {formatWhen(r.requestedAt)}
                  </p>
                  {r.studentNote && <p className="mt-1 text-sm text-ink-soft">“{r.studentNote}”</p>}
                </div>
                <ClaimButton reviewId={r.id} />
              </Card>
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Finished</h2>
          <Card className="divide-y divide-border p-0" data-testid="reviews-done">
            {done.map((r) => (
              <Link key={r.id} href={`/teacher/reviews/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-primary-soft/40">
                <span className="font-medium text-ink">
                  {r.studentName} · {taskLabel(r.taskType)}
                </span>
                <span className="text-xs text-ink-soft">
                  Band {r.bandEstimate?.toFixed(1)} · {formatWhen(r.completedAt)}
                </span>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

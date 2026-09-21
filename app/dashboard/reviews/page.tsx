import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { auth } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/gate";
import { listStudentReviews } from "@/lib/services/writing-reviews";
import { REVIEW_STATUS_LABELS } from "@/lib/reviews/rules";
import { formatWhen } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Teacher feedback — BanglaEnglish" };

const TONE = { REQUESTED: "neutral", IN_REVIEW: "accent", COMPLETED: "success", CANCELLED: "neutral" } as const;

export default async function ReviewsPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const gate = checkFeature(userId, "TEACHER_FEEDBACK");
  const reviews = listStudentReviews(userId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Teacher feedback</h1>
        <p className="mt-1 text-sm text-ink-soft">Essays a teacher has been asked to review. Open one to read the feedback next to the AI feedback.</p>
      </div>

      {!gate.allowed && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5" data-testid="reviews-locked">
          <p className="text-sm text-ink-soft">
            Teacher feedback is included from the <strong className="text-ink">{gate.requiredPlanName}</strong> plan. You&apos;re on <strong className="text-ink">{gate.ent.plan.name}</strong>.
            {reviews.length > 0 && " Your past reviews stay available below."}
          </p>
          <LinkButton href="/dashboard/billing" size="sm">
            See my plan
          </LinkButton>
        </Card>
      )}

      {reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="No reviews yet"
          description="Write an IELTS essay, then choose “Ask a teacher to review this essay” on its result page."
          action={<LinkButton href="/dashboard/ielts/writing">Go to Writing</LinkButton>}
        />
      ) : (
        <div className="flex flex-col gap-3" data-testid="review-list">
          {reviews.map((r) => (
            <Link key={r.id} href={`/dashboard/ielts/writing/submission/${r.submissionId}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-primary/40">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{r.taskType === "TASK1" ? "Task 1" : "Task 2"} · {r.wordCount} words</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{r.promptText}</p>
                  <p className="mt-1 text-xs text-ink-soft">Asked {formatWhen(r.requestedAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {r.status === "COMPLETED" && r.bandEstimate != null && <span className="text-sm font-medium text-ink">Band {r.bandEstimate.toFixed(1)}</span>}
                  <Badge tone={TONE[r.status]}>{REVIEW_STATUS_LABELS[r.status]}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

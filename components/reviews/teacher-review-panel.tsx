import Link from "next/link";
import { GraduationCap, Hourglass, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { CancelRequestButton, RequestReviewForm } from "@/components/reviews/student-controls";
import { formatWhen } from "@/lib/teaching/rules";
import { taskCriterionLabel } from "@/lib/ielts/writing";

export type PanelReview = {
  id: string;
  status: "REQUESTED" | "IN_REVIEW" | "COMPLETED" | "CANCELLED";
  teacherName: string | null;
  bandEstimate: number | null;
  taskResponseFeedback: string | null;
  coherenceFeedback: string | null;
  vocabularyFeedback: string | null;
  grammarFeedback: string | null;
  overallComments: string | null;
  completedAt: string | null;
};

/**
 * The human-teacher side of an essay's feedback: ask for a review (Pro plan), follow its progress, or read it.
 * It sits beside the AI feedback so the student sees both.
 */
export function TeacherReviewPanel({ submissionId, taskType, review, allowed, requiredPlanName }: { submissionId: string; taskType: "TASK1" | "TASK2"; review: PanelReview | null; allowed: boolean; requiredPlanName: string }) {
  if (review?.status === "COMPLETED") {
    const sections = [
      { label: taskCriterionLabel(taskType), text: review.taskResponseFeedback },
      { label: "Coherence and cohesion", text: review.coherenceFeedback },
      { label: "Vocabulary", text: review.vocabularyFeedback },
      { label: "Grammar", text: review.grammarFeedback },
    ].filter((s) => s.text);
    return (
      <Card className="border-primary/30 p-6" data-testid="teacher-review">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg text-ink">
              <GraduationCap className="h-5 w-5 text-primary" /> Teacher feedback
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              {review.teacherName ?? "Your teacher"} · {formatWhen(review.completedAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-soft">Teacher&apos;s estimate</p>
            <p className="font-display text-3xl text-ink">Band {review.bandEstimate?.toFixed(1)}</p>
          </div>
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">{review.overallComments}</p>
        {sections.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {sections.map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-4">
                <h3 className="text-sm font-medium text-ink">{s.label}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{s.text}</p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-ink-soft">This is your teacher&apos;s own estimate, not an official IELTS score. Compare it with the AI feedback on this page.</p>
      </Card>
    );
  }

  if (review && (review.status === "REQUESTED" || review.status === "IN_REVIEW")) {
    return (
      <Card className="p-6" data-testid="teacher-review">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-dark">
              <Hourglass className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="font-display text-lg text-ink">Teacher feedback</h2>
              <p className="mt-1 text-sm text-ink-soft">{review.status === "REQUESTED" ? "Your request is waiting for a teacher. You'll be notified when someone picks it up." : `${review.teacherName ?? "A teacher"} is reviewing your essay. You'll be notified when it's ready.`}</p>
            </div>
          </div>
          {review.status === "REQUESTED" ? <CancelRequestButton reviewId={review.id} /> : <Badge tone="accent">In review</Badge>}
        </div>
      </Card>
    );
  }

  if (!allowed) {
    return (
      <Card className="p-6" data-testid="teacher-review-locked">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Lock className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="font-display text-lg text-ink">Get a teacher&apos;s feedback</h2>
              <p className="mt-1 text-sm text-ink-soft">A real teacher reads your essay and gives a band estimate with feedback. Included from the {requiredPlanName} plan.</p>
            </div>
          </div>
          <LinkButton href="/dashboard/billing" variant="outline" size="sm">
            See my plan
          </LinkButton>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6" data-testid="teacher-review-request">
      <h2 className="flex items-center gap-2 font-display text-lg text-ink">
        <GraduationCap className="h-5 w-5 text-primary" /> Get a teacher&apos;s feedback
      </h2>
      <p className="mb-4 mt-1 text-sm text-ink-soft">
        A real teacher reads this essay and gives a band estimate with feedback on each criterion. See all your requests under <Link href="/dashboard/reviews" className="text-primary underline">Teacher feedback</Link>.
      </p>
      <RequestReviewForm submissionId={submissionId} />
    </Card>
  );
}

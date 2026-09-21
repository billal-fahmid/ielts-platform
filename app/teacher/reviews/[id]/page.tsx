import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/security/guards";
import { reviewForTeacher } from "@/lib/services/writing-reviews";
import { formatWhen } from "@/lib/teaching/rules";
import { taskCriterionLabel } from "@/lib/ielts/writing";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClaimButton, ReleaseButton, ReviewForm } from "@/components/teacher/review-controls";

export const metadata = { title: "Writing review — Teaching" };

export default async function TeacherReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageRole(["TEACHER"]);
  // A queued request (summary only), or a review this teacher picked up. Anyone else's is a 404.
  const view = reviewForTeacher(user.id, id);
  if (!view) notFound();
  const { review: r, essay } = view;
  const ai = "ai" in view ? view.ai : null;
  const taskName = r.taskType === "TASK1" ? "Task 1" : "Task 2";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/teacher/reviews" className="text-sm text-ink-soft hover:text-ink">
        ← Writing reviews
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">
            {r.studentName} · {taskName}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {r.wordCount} words · target Band {r.targetBand ?? "not set"} · asked {formatWhen(r.requestedAt)}
          </p>
        </div>
        <Badge tone={r.status === "COMPLETED" ? "success" : r.status === "IN_REVIEW" ? "accent" : "neutral"}>{r.status === "COMPLETED" ? "Finished" : r.status === "IN_REVIEW" ? "In progress" : "In the queue"}</Badge>
      </div>

      {r.studentNote && (
        <Card className="p-4 text-sm text-ink">
          <span className="font-medium">The student asked: </span>
          {r.studentNote}
        </Card>
      )}

      {!essay ? (
        <Card className="flex flex-col items-start gap-3 p-5">
          <p className="text-sm text-ink-soft">Pick this request up to read the essay. Once you do, it&apos;s yours until you finish it or put it back.</p>
          <ClaimButton reviewId={r.id} label="Pick this up and read the essay" />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-4">
            <Card className="p-5">
              <h2 className="font-display text-lg text-ink">The question</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-soft">{essay.prompt}</p>
              <h2 className="mt-5 font-display text-lg text-ink">The student&apos;s essay</h2>
              <p className="mt-1 text-xs text-ink-soft">
                {essay.wordCount} words · {essay.timeSpentSeconds < 60 ? "under 1 min" : `${Math.floor(essay.timeSpentSeconds / 60)} min`}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink" data-testid="essay">
                {essay.content}
              </p>
            </Card>

            <Card className="p-5" data-testid="ai-feedback">
              <h2 className="font-display text-lg text-ink">AI feedback (for reference)</h2>
              {!ai ? (
                <p className="mt-2 text-sm text-ink-soft">The student has no AI feedback for this essay.</p>
              ) : (
                <>
                  <p className="mt-2 text-sm text-ink">
                    AI estimate: <span className="font-medium">Band {ai.estimatedBand.toFixed(1)}</span>
                    {ai.bandRangeLow != null && ai.bandRangeHigh != null && ` (range ${ai.bandRangeLow.toFixed(1)}–${ai.bandRangeHigh.toFixed(1)})`}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {taskCriterionLabel(essay.taskType)} {ai.taskResponse.toFixed(1)} · Coherence {ai.fluencyCoherence.toFixed(1)} · Lexical {ai.lexicalResource.toFixed(1)} · Grammar {ai.grammarAccuracy.toFixed(1)}
                  </p>
                  {(ai.strengths ?? []).length > 0 && (
                    <>
                      <h3 className="mt-3 text-sm font-medium text-ink">AI says it worked well</h3>
                      <ul className="mt-1 list-disc pl-5 text-sm text-ink-soft">
                        {(ai.strengths ?? []).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {(ai.weaknesses ?? []).length > 0 && (
                    <>
                      <h3 className="mt-3 text-sm font-medium text-ink">AI says to improve</h3>
                      <ul className="mt-1 list-disc pl-5 text-sm text-ink-soft">
                        {(ai.weaknesses ?? []).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  <p className="mt-3 text-xs text-ink-soft">Generated by AI. It can be wrong; your judgement comes first.</p>
                </>
              )}
            </Card>
          </div>

          <Card className="h-fit p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg text-ink">Your review</h2>
              {r.status === "IN_REVIEW" && <ReleaseButton reviewId={r.id} />}
            </div>
            {r.status === "COMPLETED" && <p className="mt-1 text-xs text-ink-soft">Sent to the student {formatWhen(r.completedAt)}. You can still correct it.</p>}
            <div className="mt-4">
              <ReviewForm
                reviewId={r.id}
                completed={r.status === "COMPLETED"}
                taskLabel={taskCriterionLabel(essay.taskType)}
                initial={{ bandEstimate: r.bandEstimate, taskResponseFeedback: r.taskResponseFeedback, coherenceFeedback: r.coherenceFeedback, vocabularyFeedback: r.vocabularyFeedback, grammarFeedback: r.grammarFeedback, overallComments: r.overallComments }}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

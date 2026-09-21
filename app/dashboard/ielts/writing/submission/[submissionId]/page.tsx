import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSubmission, getEvaluation, getPrompt } from "@/lib/services/writing";
import { getProfile } from "@/lib/services/users";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { checkFeature } from "@/lib/plans/gate";
import { reviewForSubmission } from "@/lib/services/writing-reviews";
import { TeacherReviewPanel } from "@/components/reviews/teacher-review-panel";
import { RetryFeedback } from "@/components/ielts/retry-feedback";
import { BandSummaryCard, CriteriaGrid } from "@/components/ielts/feedback-cards";
import { taskCriterionLabel, WRITING_CATEGORY_LABELS } from "@/lib/ielts/writing";
import { CheckCircle2, AlertCircle, Sparkles, ArrowRight, ArrowRightLeft, PenLine, Info, Layers, Link2 } from "lucide-react";

export default async function WritingResultPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;

  const submission = getSubmission(submissionId);
  if (!submission || submission.userId !== userId) redirect("/dashboard/ielts/writing");
  if (submission.status === "DRAFT") {
    redirect(submission.promptId ? `/dashboard/ielts/writing/${submission.promptId}` : "/dashboard/ielts/writing");
  }

  const evaluation = getEvaluation(submissionId);
  const prompt = submission.promptId ? getPrompt(submission.promptId) : undefined;
  const target = getProfile(userId)?.ieltsTarget ?? null;
  const taskLabel = submission.taskType === "TASK1" ? "Task 1" : "Task 2";
  const gate = checkFeature(userId, "TEACHER_FEEDBACK");
  const review = reviewForSubmission(userId, submissionId);
  const teacherPanel = <TeacherReviewPanel submissionId={submissionId} taskType={submission.taskType} review={review} allowed={gate.allowed} requiredPlanName={gate.requiredPlanName} />;

  const essay = (
    <details className="rounded-xl border border-border bg-surface p-5">
      <summary className="cursor-pointer text-sm font-medium text-ink">
        Your response ({submission.wordCount} words)
      </summary>
      <p className="mt-2 text-xs text-ink-soft">{submission.promptTextSnapshot}</p>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink">{submission.content}</p>
    </details>
  );

  const actions = (
    <div className="flex flex-wrap gap-3">
      {submission.promptId && (
        <LinkButton href={`/dashboard/ielts/writing/${submission.promptId}`} variant="outline">
          <PenLine className="h-4 w-4" /> Write it again
        </LinkButton>
      )}
      <LinkButton href="/dashboard/ielts/writing">
        More tasks <ArrowRight className="h-4 w-4" />
      </LinkButton>
      <LinkButton href="/dashboard/ielts" variant="ghost">
        Back to IELTS dashboard
      </LinkButton>
    </div>
  );

  if (!evaluation) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl text-ink">{taskLabel} — Submitted</h1>
          <p className="mt-1 text-sm text-ink-soft">Your response is saved.</p>
        </div>
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-dark">
              <Info className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="font-display text-lg text-ink">AI feedback isn't available right now</h2>
              <p className="mt-1 text-sm text-ink-soft">
                We couldn't generate feedback for this response yet. Nothing is lost — you can try again in a moment.
              </p>
              <RetryFeedback endpoint={`/api/ielts/writing/${submissionId}/evaluate`} />
            </div>
          </div>
        </Card>
        {teacherPanel}
        {essay}
        {actions}
      </div>
    );
  }

  const criteria = [
    { label: taskCriterionLabel(submission.taskType), score: evaluation.taskResponse },
    { label: "Coherence & Cohesion", score: evaluation.fluencyCoherence },
    { label: "Lexical Resource", score: evaluation.lexicalResource },
    { label: "Grammatical Range & Accuracy", score: evaluation.grammarAccuracy },
  ];
  const low = evaluation.bandRangeLow ?? evaluation.estimatedBand;
  const high = evaluation.bandRangeHigh ?? evaluation.estimatedBand;

  const strengths = evaluation.strengths ?? [];
  const weaknesses = evaluation.weaknesses ?? [];
  const corrections = evaluation.grammarCorrections ?? [];
  const vocab = evaluation.vocabularySuggestions ?? [];
  const plan = evaluation.improvementPlan ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{taskLabel} — AI feedback</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {prompt ? `${WRITING_CATEGORY_LABELS[prompt.category] ?? prompt.category} · ` : ""}
          {submission.wordCount} words · {submission.timeSpentSeconds < 60 ? "under 1 min" : `${Math.floor(submission.timeSpentSeconds / 60)} min`}
        </p>
      </div>

      {teacherPanel}

      <BandSummaryCard band={evaluation.estimatedBand} low={low} high={high} target={target} />

      <CriteriaGrid criteria={criteria} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">What worked well</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {s}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">What to improve</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> {w}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {evaluation.coherenceFeedback && (
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-lg text-ink">
              <Link2 className="h-4.5 w-4.5 text-primary" /> Coherence feedback
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{evaluation.coherenceFeedback}</p>
          </Card>
        )}
        {evaluation.structureFeedback && (
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-lg text-ink">
              <Layers className="h-4.5 w-4.5 text-primary" /> Structure feedback
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{evaluation.structureFeedback}</p>
          </Card>
        )}
      </div>

      {corrections.length > 0 && (
        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">Grammar issues</h2>
          <div className="mt-4 flex flex-col gap-3">
            {corrections.map((c, i) => (
              <div key={i} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded bg-danger-soft px-2 py-0.5 text-danger line-through">{c.original}</span>
                  <ArrowRightLeft className="h-3.5 w-3.5 text-ink-soft" />
                  <span className="rounded bg-success-soft px-2 py-0.5 text-success">{c.corrected}</span>
                </div>
                <p className="mt-2 text-xs text-ink-soft">{c.explanation}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {vocab.length > 0 && (
        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">Vocabulary suggestions</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {vocab.map((v, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {v}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {plan.length > 0 && (
        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">Your improvement plan</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {plan.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {essay}

      <p className="text-xs text-ink-soft">
        Generated by AI{evaluation.modelUsed ? ` (${evaluation.modelUsed})` : ""}. This is an unofficial practice estimate.
      </p>

      {actions}
    </div>
  );
}

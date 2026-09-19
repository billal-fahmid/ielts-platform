import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAttempt, getPassage, getQuestionsForPassage } from "@/lib/services/reading";
import { isAnswerCorrect } from "@/lib/ielts/question-types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from "lucide-react";

function formatAnswer(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, string>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  }
  return String(value);
}

export default async function ReadingResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;

  const attempt = getAttempt(attemptId);
  if (!attempt || attempt.userId !== userId || !attempt.readingPassageId) redirect("/dashboard/ielts/reading");
  if (attempt.status !== "COMPLETED") redirect(`/dashboard/ielts/reading/${attempt.readingPassageId}`);

  const passage = getPassage(attempt.readingPassageId)!;
  const questions = getQuestionsForPassage(attempt.readingPassageId);
  const answers = (attempt.answers as Record<string, unknown>) ?? {};

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{passage.title} — Results</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {passage.testType === "GENERAL_TRAINING" ? "General Training" : "Academic"} Reading
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Estimated band</p>
          <p className="mt-1 font-display text-3xl text-primary">{attempt.bandScore?.toFixed(1) ?? "—"}</p>
          <Badge tone="neutral" className="mt-2">Estimate, not an official score</Badge>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Raw score</p>
          <p className="mt-1 font-display text-3xl text-ink">
            {attempt.rawScore} / {attempt.totalQuestions}
          </p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Time spent</p>
          <p className="mt-1 font-display text-3xl text-ink">
            {Math.floor(attempt.timeSpentSeconds / 60)}m {attempt.timeSpentSeconds % 60}s
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-display text-lg text-ink">Answer review</h2>
        <div className="mt-4 flex flex-col gap-3">
          {questions.map((q, i) => {
            const studentAnswer = answers[q.id];
            const correct = isAnswerCorrect(q.questionType, q.correctAnswer, studentAnswer);
            return (
              <div key={q.id} className="rounded-lg border border-border p-4">
                <div className="flex items-start gap-2">
                  {correct ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-ink">
                      {i + 1}. {q.prompt}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Your answer: {formatAnswer(studentAnswer)}
                      {!correct && <> · Correct: {formatAnswer(q.correctAnswer)}</>}
                    </p>
                    {q.explanation && <p className="mt-1 text-xs text-ink-soft">{q.explanation}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <LinkButton href={`/dashboard/ielts/reading/${passage.id}`} variant="outline">
          <RotateCcw className="h-4 w-4" /> Retake
        </LinkButton>
        <LinkButton href="/dashboard/ielts/reading">
          More passages <ArrowRight className="h-4 w-4" />
        </LinkButton>
        <LinkButton href="/dashboard/ielts" variant="ghost">
          Back to IELTS dashboard
        </LinkButton>
      </div>
    </div>
  );
}

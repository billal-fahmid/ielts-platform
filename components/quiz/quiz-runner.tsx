"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type QuizQuestion = {
  id: string;
  type: "MCQ" | "TRUE_FALSE" | "FILL_BLANK";
  prompt: string;
  options?: string[] | null;
};

export type QuizResult = {
  score: number;
  total: number;
  perQuestion?: { questionId: string; isCorrect: boolean; correctAnswer: string; explanation?: string | null }[];
  xpEarned?: number;
};

export function QuizRunner({
  questions,
  onSubmit,
  onFinish,
  title,
}: {
  questions: QuizQuestion[];
  onSubmit: (answers: Record<string, string>) => Promise<QuizResult>;
  onFinish?: (result: QuizResult) => void;
  title?: string;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = questions[index];
  const isLast = index === questions.length - 1;
  const answered = Object.keys(answers).length;

  const select = (val: string) => setAnswers((a) => ({ ...a, [q.id]: val }));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await onSubmit(answers);
      setResult(res);
      onFinish?.(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't submit your quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const retry = () => {
    setAnswers({});
    setIndex(0);
    setResult(null);
  };

  if (result) {
    const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <div
          className={cn(
            "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
            pct >= 60 ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
          )}
        >
          {pct >= 60 ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
        </div>
        <h2 className="mt-4 font-display text-2xl text-ink">
          {result.score} / {result.total} correct
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{pct}% score{result.xpEarned ? ` · +${result.xpEarned} XP` : ""}</p>

        {result.perQuestion && (
          <div className="mt-6 flex flex-col gap-3 text-left">
            {questions.map((qq, i) => {
              const pq = result.perQuestion!.find((p) => p.questionId === qq.id);
              return (
                <div key={qq.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start gap-2">
                    {pq?.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    )}
                    <div>
                      <p className="text-sm text-ink">
                        {i + 1}. {qq.prompt}
                      </p>
                      <p className="mt-1 text-xs text-ink-soft">
                        Your answer: {answers[qq.id] || "—"}
                        {!pq?.isCorrect && <> · Correct: {pq?.correctAnswer}</>}
                      </p>
                      {pq?.explanation && <p className="mt-1 text-xs text-ink-soft">{pq.explanation}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button variant="outline" onClick={retry} className="mt-6">
          <RotateCcw className="h-4 w-4" /> Retry quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <div className="flex items-center justify-between text-xs text-ink-soft">
        <span>
          {title ?? "Quiz"} · Question {index + 1} of {questions.length}
        </span>
        <span>{answered} answered</span>
      </div>
      <ProgressBar value={((index + 1) / questions.length) * 100} className="mt-2" />

      <p className="mt-6 font-display text-lg text-ink">{q.prompt}</p>

      <div className="mt-5 flex flex-col gap-2.5">
        {q.type === "FILL_BLANK" ? (
          <input
            type="text"
            value={answers[q.id] || ""}
            onChange={(e) => select(e.target.value)}
            placeholder="Type your answer"
            className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
        ) : (
          (q.options ?? []).map((opt) => (
            <button
              key={opt}
              onClick={() => select(opt)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border p-3.5 text-left text-sm transition-colors",
                answers[q.id] === opt ? "border-primary bg-primary-soft text-ink" : "border-border text-ink hover:border-primary/50"
              )}
            >
              <span
                className={cn(
                  "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border",
                  answers[q.id] === opt ? "border-primary bg-primary" : "border-border"
                )}
              >
                {answers[q.id] === opt && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
              {opt}
            </button>
          ))
        )}
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-7 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        {isLast ? (
          <Button onClick={submit} loading={submitting} disabled={answered < questions.length}>
            Submit quiz
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))} disabled={!answers[q.id]}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { QuizRunner, QuizQuestion } from "@/components/quiz/quiz-runner";

export function QuizSection({
  quizId,
  questions,
  usage,
}: {
  quizId: string;
  questions: QuizQuestion[];
  /** On plans with a daily quiz limit: how many were used today. */
  usage?: { used: number; limit: number | null };
}) {
  const router = useRouter();
  const atLimit = !!usage && usage.limit !== null && usage.used >= usage.limit;

  const onSubmit = async (answers: Record<string, string>) => {
    const res = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId, answers }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "We couldn't submit your quiz. Please try again.");
    return { score: json.score, total: json.total, perQuestion: json.perQuestion, xpEarned: json.xpEarned };
  };

  if (atLimit) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-6" data-testid="quiz-limit">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <Lock className="h-4 w-4 text-primary" /> You&apos;ve used today&apos;s {usage!.limit} free quizzes
        </span>
        <p className="text-sm text-ink-soft">The limit resets tomorrow. Upgrade to Basic for unlimited quizzes.</p>
        <Link href="/dashboard/billing" className="text-sm font-medium text-primary hover:underline">
          See plans
        </Link>
      </div>
    );
  }

  return (
    <div>
      {usage && usage.limit !== null && (
        <p className="mb-2 text-xs text-ink-soft" data-testid="quiz-usage">
          Free plan: {usage.used} of {usage.limit} quizzes used today
        </p>
      )}
      <QuizRunner questions={questions} onSubmit={onSubmit} onFinish={() => router.refresh()} />
    </div>
  );
}

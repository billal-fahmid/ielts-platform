"use client";

import { QuizRunner, QuizQuestion } from "@/components/quiz/quiz-runner";
import { useRouter } from "next/navigation";

export function QuizSection({ quizId, questions }: { quizId: string; questions: QuizQuestion[] }) {
  const router = useRouter();

  const onSubmit = async (answers: Record<string, string>) => {
    const res = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId, answers }),
    });
    const json = await res.json();
    return { score: json.score, total: json.total, perQuestion: json.perQuestion, xpEarned: json.xpEarned };
  };

  return (
    <QuizRunner
      questions={questions}
      onSubmit={onSubmit}
      onFinish={() => router.refresh()}
    />
  );
}

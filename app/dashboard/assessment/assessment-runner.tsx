"use client";

import { useRouter } from "next/navigation";
import { QuizRunner, QuizQuestion } from "@/components/quiz/quiz-runner";

export function AssessmentRunner({ questions }: { questions: QuizQuestion[] }) {
  const router = useRouter();

  const onSubmit = async (answers: Record<string, string>) => {
    const res = await fetch("/api/assessment/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const json = await res.json();
    return { score: Math.round((json.overall / 100) * questions.length), total: questions.length };
  };

  const onFinish = () => {
    setTimeout(() => {
      router.push("/dashboard/assessment/result");
      router.refresh();
    }, 1200);
  };

  return <QuizRunner questions={questions} onSubmit={onSubmit} onFinish={onFinish} title="Assessment" />;
}

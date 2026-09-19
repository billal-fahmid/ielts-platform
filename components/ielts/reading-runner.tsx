"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Clock, BookOpen, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HighlightablePassage } from "./highlightable-passage";
import { QuestionRenderer, type RunnerQuestion } from "./question-renderer";

type Passage = { title: string; testType: string; timeLimitSeconds: number; bodyText: string };

export function ReadingRunner({
  attemptId,
  passage,
  questions,
  initialAnswers,
  initialTimeSpentSeconds,
}: {
  attemptId: string;
  passage: Passage;
  questions: RunnerQuestion[];
  initialAnswers: Record<string, unknown>;
  initialTimeSpentSeconds: number;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, passage.timeLimitSeconds - initialTimeSpentSeconds));
  const [mobileTab, setMobileTab] = useState<"passage" | "questions">("passage");
  const [submitting, setSubmitting] = useState(false);
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const elapsedRef = useRef(initialTimeSpentSeconds);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const answeredCount = Object.keys(answers).filter((k) => {
    const v = answers[k];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length;

  const submit = useCallback(async () => {
    setSubmitting(true);
    const res = await fetch(`/api/ielts/reading/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: answersRef.current, timeSpentSeconds: elapsedRef.current }),
    });
    if (res.ok) {
      router.push(`/dashboard/ielts/reading/result/${attemptId}`);
    } else {
      setSubmitting(false);
    }
  }, [attemptId, router]);

  // Countdown timer, auto-submits when it hits zero.
  useEffect(() => {
    if (secondsLeft <= 0) {
      submit();
      return;
    }
    const t = setInterval(() => {
      elapsedRef.current += 1;
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft, submit]);

  // Periodic auto-save.
  useEffect(() => {
    const t = setInterval(() => {
      fetch(`/api/ielts/reading/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersRef.current, timeSpentSeconds: elapsedRef.current }),
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, [attemptId]);

  const setAnswer = (questionId: string, value: unknown) => {
    setAnswers((a) => ({ ...a, [questionId]: value }));
  };

  const scrollToQuestion = (questionId: string) => {
    setMobileTab("questions");
    requestAnimationFrame(() => {
      questionRefs.current[questionId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const timeLow = secondsLeft <= 120;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">{passage.title}</p>
          <p className="text-xs text-ink-soft">{passage.testType === "GENERAL_TRAINING" ? "General Training" : "Academic"} Reading</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-ink-soft">{answeredCount} / {questions.length} answered</span>
          <span className={cn("flex items-center gap-1.5 text-sm font-medium", timeLow ? "text-danger" : "text-ink")}>
            <Clock className="h-4 w-4" />
            {mm}:{String(ss).padStart(2, "0")}
          </span>
          <Button onClick={submit} loading={submitting} size="sm">
            Submit
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 lg:hidden">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => scrollToQuestion(q.id)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
              answers[q.id] !== undefined && answers[q.id] !== "" ? "border-primary bg-primary text-white" : "border-border text-ink-soft"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="flex gap-2 lg:hidden">
        <button
          onClick={() => setMobileTab("passage")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium",
            mobileTab === "passage" ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft"
          )}
        >
          <BookOpen className="h-4 w-4" /> Passage
        </button>
        <button
          onClick={() => setMobileTab("questions")}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium",
            mobileTab === "questions" ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft"
          )}
        >
          <ListChecks className="h-4 w-4" /> Questions
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className={cn("rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto", mobileTab !== "passage" && "hidden lg:block")}>
          <HighlightablePassage title={passage.title} bodyText={passage.bodyText} />
        </div>

        <div className={cn("flex flex-col gap-4", mobileTab !== "questions" && "hidden lg:flex")}>
          <div className="hidden flex-wrap gap-1.5 lg:flex">
            {questions.map((q, i) => (
              <button
                key={q.id}
                onClick={() => scrollToQuestion(q.id)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
                  answers[q.id] !== undefined && answers[q.id] !== "" ? "border-primary bg-primary text-white" : "border-border text-ink-soft"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {questions.map((q, i) => (
            <div
              key={q.id}
              ref={(el) => {
                questionRefs.current[q.id] = el;
              }}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <p className="text-sm font-medium text-ink">
                {i + 1}. {q.prompt}
              </p>
              <div className="mt-3">
                <QuestionRenderer question={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
              </div>
            </div>
          ))}

          <Button onClick={submit} loading={submitting} className="w-full">
            Submit Reading Test
          </Button>
        </div>
      </div>
    </div>
  );
}

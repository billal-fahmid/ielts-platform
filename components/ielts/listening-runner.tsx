"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./audio-player";
import { QuestionRenderer, type RunnerQuestion } from "./question-renderer";

type Section = { id: string; sectionNumber: number; audioUrl: string; context: string | null };
type ListeningQuestion = RunnerQuestion & { sectionId: string };

function isAnswered(v: unknown) {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).some((x) => x !== "" && x != null);
  return true;
}

export function ListeningRunner({
  attemptId,
  test,
  sections,
  questions,
  initialAnswers,
  initialTimeSpentSeconds,
  onSubmitted,
}: {
  attemptId: string;
  test: { title: string; timeLimitSeconds: number };
  sections: Section[];
  questions: ListeningQuestion[];
  initialAnswers: Record<string, unknown>;
  initialTimeSpentSeconds: number;
  /** Set inside a mock test: called instead of navigating to the practice result page. */
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers);
  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, test.timeLimitSeconds - initialTimeSpentSeconds));
  const [sectionIndex, setSectionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const elapsedRef = useRef(initialTimeSpentSeconds);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittedRef = useRef(false);

  const section = sections[sectionIndex];
  const sectionQuestions = questions.filter((q) => q.sectionId === section.id);
  const mapImage = sectionQuestions
    .filter((q) => q.questionType === "MAP_LABELING")
    .map((q) => q.content.imageUrl as string | undefined)
    .find(Boolean);
  const answeredCount = questions.filter((q) => isAnswered(answers[q.id])).length;
  const isLastSection = sectionIndex === sections.length - 1;

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const res = await fetch(`/api/ielts/listening/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: answersRef.current, timeSpentSeconds: elapsedRef.current }),
    });
    // 409 means the attempt was already submitted (e.g. the server auto-submitted it when time ran out).
    if (res.ok || (onSubmitted && res.status === 409)) {
      if (onSubmitted) onSubmitted();
      else router.push(`/dashboard/ielts/listening/result/${attemptId}`);
    } else {
      submittedRef.current = false;
      setSubmitting(false);
    }
  }, [attemptId, router, onSubmitted]);

  useEffect(() => {
    const t = setInterval(() => {
      elapsedRef.current += 1;
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) submit();
  }, [secondsLeft, submit]);

  useEffect(() => {
    const t = setInterval(() => {
      if (submittedRef.current) return;
      fetch(`/api/ielts/listening/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersRef.current, timeSpentSeconds: elapsedRef.current }),
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, [attemptId]);

  const setAnswer = (questionId: string, value: unknown) => setAnswers((a) => ({ ...a, [questionId]: value }));

  const goToQuestion = (q: ListeningQuestion) => {
    const idx = sections.findIndex((s) => s.id === q.sectionId);
    if (idx >= 0) setSectionIndex(idx);
    requestAnimationFrame(() => {
      questionRefs.current[q.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const timeLow = secondsLeft <= 120;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">{test.title}</p>
          <p className="text-xs text-ink-soft">IELTS Listening</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-ink-soft">
            {answeredCount} / {questions.length} answered
          </span>
          <span className={cn("flex items-center gap-1.5 text-sm font-medium", timeLow ? "text-danger" : "text-ink")}>
            <Clock className="h-4 w-4" />
            {mm}:{String(ss).padStart(2, "0")}
          </span>
          <Button onClick={submit} loading={submitting} size="sm">
            Submit
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {sections.map((s, i) => {
          const qs = questions.filter((q) => q.sectionId === s.id);
          const done = qs.filter((q) => isAnswered(answers[q.id])).length;
          return (
            <button
              key={s.id}
              onClick={() => setSectionIndex(i)}
              className={cn(
                "flex flex-1 flex-col items-center rounded-lg border py-2 text-sm font-medium",
                i === sectionIndex ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft"
              )}
            >
              Section {s.sectionNumber}
              <span className="text-xs font-normal">
                {done} / {qs.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => goToQuestion(q)}
            aria-label={`Go to question ${i + 1}`}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
              isAnswered(answers[q.id]) ? "border-primary bg-primary text-white" : "border-border text-ink-soft"
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <div className="flex flex-col gap-4 lg:sticky lg:top-32">
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="font-display text-lg text-ink">Section {section.sectionNumber}</h2>
            {section.context && <p className="mt-1 text-sm text-ink-soft">{section.context}</p>}
          </div>
          <AudioPlayer key={section.id} src={section.audioUrl} />
          {mapImage && (
            <div className="rounded-xl border border-border bg-surface p-3">
              <img loading="lazy" decoding="async" src={mapImage} alt="Map for this section" className="w-full rounded-lg" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {sectionQuestions.map((q) => {
            const number = questions.indexOf(q) + 1;
            return (
              <div
                key={q.id}
                ref={(el) => {
                  questionRefs.current[q.id] = el;
                }}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <p className="text-sm font-medium text-ink">
                  {number}. {q.prompt}
                </p>
                <div className="mt-3">
                  <QuestionRenderer question={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} hideImage />
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setSectionIndex((i) => i - 1)} disabled={sectionIndex === 0}>
              <ChevronLeft className="h-4 w-4" /> Previous section
            </Button>
            {isLastSection ? (
              <Button onClick={submit} loading={submitting}>
                Submit Listening Test
              </Button>
            ) : (
              <Button onClick={() => setSectionIndex((i) => i + 1)}>
                Next section <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

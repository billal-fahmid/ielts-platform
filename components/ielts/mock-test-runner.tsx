"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Headphones, BookOpen, PenLine, Mic, Maximize2, Minimize2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Stage } from "@/lib/services/mock-test";
import { ListeningRunner } from "./listening-runner";
import { ReadingRunner } from "./reading-runner";
import { SpeakingSession } from "./speaking-session";
import { MockWritingStage } from "./mock-writing-stage";

type SectionKey = "LISTENING" | "READING" | "WRITING" | "SPEAKING";

const STEPS: { key: SectionKey; label: string; icon: typeof Headphones }[] = [
  { key: "LISTENING", label: "Listening", icon: Headphones },
  { key: "READING", label: "Reading", icon: BookOpen },
  { key: "WRITING", label: "Writing", icon: PenLine },
  { key: "SPEAKING", label: "Speaking", icon: Mic },
];

const SECTION_BLURBS: Record<SectionKey, string> = {
  LISTENING: "The audio plays once. Answer as you listen, and use the last moments to check your answers.",
  READING: "Read the passage and answer the questions. Watch the clock: you can't add time.",
  WRITING: "You have 60 minutes for both tasks. Spend about 20 minutes on Task 1 and 40 on Task 2 — Task 2 counts for more.",
  SPEAKING: "A short interview in three parts. Your browser turns your speech into text, which the AI then reviews.",
};

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).catch(() => null);
  const data = await res?.json().catch(() => null);
  return { ok: !!res?.ok, status: res?.status ?? 0, data };
}

export function MockTestRunner({ attemptId, mockTitle, stage }: { attemptId: string; mockTitle: string; stage: Stage }) {
  const router = useRouter();
  const [fullscreen, setFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false); // decided after mount so server and client markup match
  const [wantedFullscreen, setWantedFullscreen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [starting, setStarting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const retryRef = useRef<(() => void) | null>(null);

  const section = stage.section === "DONE" ? null : stage.section;
  const active = "phase" in stage && stage.phase === "active";

  // The test fills the screen and the page behind it doesn't scroll.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onChange = () => {
      const on = !!document.fullscreenElement;
      setFullscreen(on);
      if (on) setWantedFullscreen(true);
    };
    setCanFullscreen(!!document.documentElement.requestFullscreen);
    document.addEventListener("fullscreenchange", onChange);
    onChange();
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  // A timed section is running: warn before the tab is closed or reloaded.
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);

  const enterFullscreen = () => document.documentElement.requestFullscreen?.().catch(() => {});
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      setWantedFullscreen(false);
      document.exitFullscreen?.().catch(() => {});
    } else enterFullscreen();
  };

  const goToResult = useCallback(() => router.replace(`/dashboard/ielts/mock-test/result/${attemptId}`), [router, attemptId]);

  /** Tell the server a section is done (or that time is up); it decides what comes next. */
  const advance = useCallback(
    async (body?: unknown): Promise<string | null> => {
      const { ok, data } = await postJson(`/api/ielts/mock-test/${attemptId}/advance`, body);
      if (!ok) return data?.error ?? "We couldn't reach the server. Check your connection and try again.";
      if (data?.currentSection === "DONE") goToResult();
      else router.refresh();
      return null;
    },
    [attemptId, goToResult, router]
  );

  /** Used by the runners that submit themselves; a failure shows a banner with a retry. */
  const advanceAfterSubmit = useCallback(
    async (body?: unknown) => {
      const message = await advance(body);
      if (message) {
        setProblem(message);
        retryRef.current = () => {
          setProblem(null);
          advanceAfterSubmit(body);
        };
      }
    },
    [advance]
  );

  const startSection = async () => {
    setStarting(true);
    setProblem(null);
    if (canFullscreen && !document.fullscreenElement && !wantedFullscreen) enterFullscreen();
    const { ok, data } = await postJson(`/api/ielts/mock-test/${attemptId}/section`);
    if (!ok) {
      setStarting(false);
      setProblem(data?.error ?? "We couldn't start this section. Please try again.");
      return;
    }
    router.refresh();
  };

  // Once the server has moved on (new stage), clear the start button state.
  const stageKey = stage.section === "DONE" ? "done" : `${stage.section}-${stage.phase}-${stageIdentity(stage)}`;
  useEffect(() => {
    setStarting(false);
  }, [stageKey]);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-bg" data-testid="mock-overlay">
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{mockTitle}</p>
          <p className="text-xs text-ink-soft">Full mock test · AI-estimated bands, not official</p>
        </div>

        <ol className="hidden items-center gap-1 md:flex" aria-label="Test progress">
          {STEPS.map((s, i) => {
            const currentIndex = section ? STEPS.findIndex((x) => x.key === section) : STEPS.length;
            const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
            const Icon = s.icon;
            return (
              <li
                key={s.key}
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  state === "current" && "bg-primary text-white",
                  state === "done" && "text-success",
                  state === "todo" && "text-ink-soft"
                )}
              >
                {state === "done" ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                {s.label}
              </li>
            );
          })}
        </ol>

        <div className="flex shrink-0 items-center gap-2">
          {canFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
              className="rounded-full p-2 text-ink-soft hover:bg-primary-soft hover:text-ink"
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
          <Button variant="outline" size="sm" onClick={() => setConfirmExit(true)}>
            <X className="h-4 w-4" /> Exit
          </Button>
        </div>
      </header>

      {/* Compact progress for small screens. */}
      <p className="border-b border-border bg-surface px-4 py-2 text-center text-xs text-ink-soft md:hidden">
        {section ? `Section ${STEPS.findIndex((s) => s.key === section) + 1} of 4 · ${STEPS.find((s) => s.key === section)!.label}` : "Finishing…"}
      </p>

      {confirmExit && (
        <div className="border-b border-border bg-surface">
          <div role="alertdialog" aria-label="Leave the test?" className="container-page flex flex-col gap-3 py-4">
            <p className="text-sm font-medium text-ink">Leave the test?</p>
            <p className="text-sm text-ink-soft">
              {active
                ? "The clock keeps running while you're away. Your answers are saved, and the section is submitted automatically when time runs out."
                : "You can pick up where you left off any time."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" size="sm" onClick={() => router.push("/dashboard/ielts/mock-test")}>
                Leave the test
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmExit(false)}>
                Stay
              </Button>
            </div>
          </div>
        </div>
      )}

      {active && canFullscreen && wantedFullscreen && !fullscreen && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-accent-soft px-4 py-2 text-sm text-ink" role="status">
          <AlertTriangle className="h-4 w-4 shrink-0" /> You left full-screen mode. The clock is still running.
          <Button size="sm" variant="outline" onClick={enterFullscreen}>
            Return to full screen
          </Button>
        </div>
      )}

      {problem && (
        <div role="alert" className="container-page mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
          {problem}
          {retryRef.current && (
            <Button size="sm" variant="outline" onClick={() => retryRef.current?.()}>
              Try again
            </Button>
          )}
        </div>
      )}

      <main className="container-page py-6">
        {stage.section !== "DONE" && stage.phase === "ready" && (
          <ReadyScreen stage={stage} onStart={startSection} loading={starting} />
        )}

        {stage.section === "LISTENING" && stage.phase === "active" && (
          <ListeningRunner key={stage.props.attemptId} {...stage.props} onSubmitted={() => advanceAfterSubmit()} />
        )}

        {stage.section === "READING" && stage.phase === "active" && (
          <div className="flex flex-col gap-3">
            {stage.count > 1 && (
              <p className="text-xs text-ink-soft">
                Passage {stage.index} of {stage.count}
              </p>
            )}
            <ReadingRunner key={stage.props.attemptId} {...stage.props} onSubmitted={() => advanceAfterSubmit()} />
          </div>
        )}

        {stage.section === "WRITING" && stage.phase === "active" && (
          <MockWritingStage key="writing" remainingSeconds={stage.remainingSeconds} tasks={stage.tasks} onFinish={(essays) => advance({ writing: essays })} />
        )}

        {stage.section === "SPEAKING" && (
          <div key="speaking" className="flex flex-col gap-4">
            <p className="mx-auto w-full max-w-2xl rounded-lg bg-accent-soft px-3 py-2 text-sm text-ink-soft">{SECTION_BLURBS.SPEAKING}</p>
            <SpeakingSession mode="full" onFinished={(sessionId) => advanceAfterSubmit({ speakingSessionId: sessionId })} />
          </div>
        )}

        {stage.section === "DONE" && (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
            <p className="font-display text-xl text-ink">Test complete</p>
            <Button onClick={goToResult}>See my results</Button>
          </div>
        )}
      </main>
    </div>
  );
}

function stageIdentity(stage: Exclude<Stage, { section: "DONE" }>) {
  if (stage.section === "READING") return stage.phase === "ready" ? stage.info.index : stage.index;
  return 0;
}

function ReadyScreen({
  stage,
  onStart,
  loading,
}: {
  stage: Extract<Stage, { phase: "ready" }>;
  onStart: () => void;
  loading: boolean;
}) {
  const step = STEPS.find((s) => s.key === stage.section)!;
  const Icon = step.icon;

  let facts: string[] = [];
  let title = step.label;
  if (stage.section === "LISTENING") {
    facts = [`${stage.info.minutes} minutes`, `${stage.info.sections} sections`, `${stage.info.questions} questions`];
    title = "Listening";
  } else if (stage.section === "READING") {
    facts = [`${stage.info.minutes} minutes`, `${stage.info.questions} questions`];
    title = stage.info.count > 1 ? `Reading · passage ${stage.info.index} of ${stage.info.count}` : "Reading";
  } else if (stage.section === "WRITING") {
    facts = [`${stage.info.minutes} minutes`, "2 tasks"];
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 rounded-2xl border border-border bg-surface p-6 sm:p-8" data-testid="ready-screen">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-soft">Next up</p>
          <h1 className="font-display text-2xl text-ink">{title}</h1>
        </div>
      </div>

      {facts.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {facts.map((f) => (
            <li key={f} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-ink-soft">
              {f.includes("minutes") && <Clock className="h-3.5 w-3.5" />}
              {f}
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-ink-soft">{SECTION_BLURBS[stage.section]}</p>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink-soft">
        <li>The timer starts when you press Start and can&apos;t be paused.</li>
        <li>Your work is saved as you go. If you close the tab, the clock keeps running.</li>
        <li>When time is up, the section is submitted for you.</li>
      </ul>

      <Button size="lg" onClick={onStart} loading={loading} className="self-start">
        Start {step.label}
      </Button>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX, Loader2, Clock, Mic, Keyboard, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { AnswerRecorder, type AnswerResult } from "./answer-recorder";
import { requestMicrophone, useSpeechSupport } from "@/hooks/use-speech-recognition";
import { useExaminerVoice } from "@/hooks/use-examiner-voice";

type Part = "PART1" | "PART2" | "PART3";
type Content = {
  part1: { id: string; text: string }[];
  cueCard: { id: string; topic: string; text: string } | null;
  part3: { id: string; text: string }[];
};

type Step =
  | { kind: "intro"; part: Part }
  | { kind: "question"; part: "PART1" | "PART3"; id: string; text: string }
  | { kind: "cue"; id: string; topic: string; text: string };

const MODE_TITLES: Record<string, string> = {
  full: "Full speaking test",
  part1: "Part 1 practice",
  part2: "Part 2 practice",
  part3: "Part 3 practice",
};

const PART_INFO: Record<Part, { title: string; blurb: string }> = {
  PART1: { title: "Part 1 · Introduction and interview", blurb: "The examiner asks you short questions about familiar topics. Aim for two or three sentences for each answer." },
  PART2: { title: "Part 2 · Long turn", blurb: "You'll get a cue card and one minute to prepare. Then speak for up to two minutes without stopping." },
  PART3: { title: "Part 3 · Discussion", blurb: "The examiner asks more abstract questions linked to your Part 2 topic. Give reasons and examples." },
};

const PREP_SECONDS = 60;
const TALK_SECONDS = 120;

function formatTime(total: number) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function buildSteps(content: Content): Step[] {
  const steps: Step[] = [];
  if (content.part1.length) {
    steps.push({ kind: "intro", part: "PART1" });
    content.part1.forEach((q) => steps.push({ kind: "question", part: "PART1", id: q.id, text: q.text }));
  }
  if (content.cueCard) {
    steps.push({ kind: "intro", part: "PART2" });
    steps.push({ kind: "cue", ...content.cueCard });
  }
  if (content.part3.length) {
    steps.push({ kind: "intro", part: "PART3" });
    content.part3.forEach((q) => steps.push({ kind: "question", part: "PART3", id: q.id, text: q.text }));
  }
  return steps;
}

export function SpeakingSession({
  mode,
  onFinished,
}: {
  mode: "full" | "part1" | "part2" | "part3";
  /** Set inside a mock test: the session is completed without AI marking and this is called instead of navigating. */
  onFinished?: (sessionId: string) => void;
}) {
  const router = useRouter();
  const supported = useSpeechSupport();
  const voice = useExaminerVoice();

  const [phase, setPhase] = useState<"intro" | "loading" | "running" | "finishing" | "error">("intro");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [typedMode, setTypedMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startedAtRef = useRef(0);
  const pendingRef = useRef<{ step: Step; answer: AnswerResult } | null>(null);

  const step = steps[stepIndex];
  const answerSteps = useMemo(() => steps.filter((s) => s.kind !== "intro"), [steps]);
  const answerPosition = step && step.kind !== "intro" ? answerSteps.indexOf(step) + 1 : 0;

  const begin = async () => {
    setPhase("loading");
    setError(null);
    const canRecord = supported === true && (await requestMicrophone()) === "granted";
    setTypedMode(!canRecord);

    const res = await fetch("/api/ielts/speaking/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data) {
      setError(data?.error ?? "We couldn't start the session. Please try again.");
      setPhase("intro");
      return;
    }
    setSessionId(data.sessionId);
    setSteps(buildSteps(data.content as Content));
    setStepIndex(0);
    startedAtRef.current = Date.now();
    setPhase("running");
  };

  const finishSession = useCallback(async () => {
    if (!sessionId) return;
    setPhase("finishing");
    const res = await fetch(`/api/ielts/speaking/${sessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalDurationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000), defer: !!onFinished }),
    }).catch(() => null);

    if (res?.ok) {
      if (onFinished) onFinished(sessionId);
      else router.push(`/dashboard/ielts/speaking/session/${sessionId}`);
      return;
    }
    const data = await res?.json().catch(() => null);
    setError(data?.error ?? "Something went wrong while finishing. Your answers are saved — please try again.");
    setPhase("error");
  }, [sessionId, router, onFinished]);

  const advance = useCallback(() => {
    if (stepIndex >= steps.length - 1) finishSession();
    else setStepIndex(stepIndex + 1);
  }, [stepIndex, steps.length, finishSession]);

  const saveAnswer = useCallback(
    async (s: Step, a: AnswerResult) => {
      if (s.kind === "intro" || !sessionId) return;
      setSaving(true);
      setSaveError(null);
      pendingRef.current = { step: s, answer: a };
      const res = await fetch(`/api/ielts/speaking/${sessionId}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part: s.kind === "cue" ? "PART2" : s.part,
          promptId: s.id,
          questionText: s.text,
          transcript: a.transcript,
          durationSeconds: a.durationSeconds,
          pauseCount: a.pauseCount,
          totalPauseMs: a.totalPauseMs,
          typed: a.typed,
        }),
      }).catch(() => null);
      setSaving(false);
      if (!res?.ok) {
        setSaveError("We couldn't save that answer. Check your connection and try again.");
        return;
      }
      pendingRef.current = null;
      advance();
    },
    [sessionId, advance]
  );

  // The examiner reads each question aloud when it appears.
  useEffect(() => {
    if (phase === "running" && step?.kind === "question") voice.speak(step.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, phase]);

  if (phase === "intro" || phase === "loading") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl text-ink">{MODE_TITLES[mode]}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            An AI-assisted practice session. Feedback at the end is an estimate, not an official IELTS score.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-display text-lg text-ink">Before you start</h2>
          <ul className="mt-3 flex flex-col gap-2.5 text-sm text-ink-soft">
            <li className="flex items-start gap-2">
              <Mic className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Find a quiet place. Your browser will ask for microphone access — allow it.
            </li>
            <li className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              Your speech is turned into text by your browser, and the AI reviews that text and your timing. It never hears your audio, so pronunciation feedback is a cautious estimate.
            </li>
          </ul>

          {supported === false && (
            <p className="mt-4 flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm text-ink-soft">
              <Keyboard className="mt-0.5 h-4 w-4 shrink-0" />
              This browser can't record speech, so you'll type your answers. For voice practice use Chrome or Edge.
            </p>
          )}

          {voice.available && (
            <button
              type="button"
              onClick={() => voice.setEnabled(!voice.enabled)}
              className="mt-4 flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
            >
              {voice.enabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
              Examiner reads questions aloud: <span className="font-medium text-ink">{voice.enabled ? "On" : "Off"}</span>
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button onClick={begin} loading={phase === "loading"} size="lg" className="self-start">
          Begin
        </Button>
      </div>
    );
  }

  if (phase === "finishing") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 rounded-xl border border-border bg-surface p-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h2 className="font-display text-xl text-ink">{onFinished ? "Saving your answers…" : "Analysing your answers…"}</h2>
        <p className="text-sm text-ink-soft">{onFinished ? "One moment." : "This can take up to a minute. Please keep this page open."}</p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-xl text-ink">We hit a problem</h2>
        <p className="text-sm text-ink-soft">{error}</p>
        <Button onClick={finishSession}>
          <RefreshCw className="h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  if (!step) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <div className="flex items-center justify-between text-xs text-ink-soft">
          <span>{MODE_TITLES[mode]}</span>
          {answerPosition > 0 && (
            <span>
              Answer {answerPosition} of {answerSteps.length}
            </span>
          )}
        </div>
        <ProgressBar value={(answerSteps.length ? Math.max(0, answerPosition - 1) / answerSteps.length : 0) * 100} className="mt-2" />
      </div>

      {step.kind === "intro" && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <Badge tone="primary">{step.part.replace("PART", "Part ")}</Badge>
          <h2 className="mt-3 font-display text-xl text-ink">{PART_INFO[step.part].title}</h2>
          <p className="mt-2 text-sm text-ink-soft">{PART_INFO[step.part].blurb}</p>
          <Button onClick={() => setStepIndex((i) => i + 1)} className="mt-5">
            Begin {step.part.replace("PART", "Part ")}
          </Button>
        </div>
      )}

      {step.kind === "question" && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <Badge tone="primary">{step.part.replace("PART", "Part ")}</Badge>
            {voice.available && voice.enabled && (
              <button
                type="button"
                onClick={() => voice.speak(step.text)}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <Volume2 className="h-3.5 w-3.5" /> Replay question
              </button>
            )}
          </div>
          <p className="mt-4 font-display text-xl leading-snug text-ink">{step.text}</p>
          <div className="mt-6">
            <AnswerRecorder
              key={stepIndex}
              typed={typedMode}
              onBeforeStart={voice.cancel}
              onFinish={(a) => saveAnswer(step, a)}
              disabled={saving}
            />
          </div>
        </div>
      )}

      {step.kind === "cue" && (
        <CueCardStep
          key={stepIndex}
          topic={step.topic}
          text={step.text}
          typedMode={typedMode}
          disabled={saving}
          onBeforeStart={voice.cancel}
          onFinish={(a) => saveAnswer(step, a)}
        />
      )}

      {saving && (
        <p className="flex items-center gap-2 text-xs text-ink-soft" role="status">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving your answer…
        </p>
      )}
      {saveError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {saveError}
          <Button size="sm" variant="outline" onClick={() => pendingRef.current && saveAnswer(pendingRef.current.step, pendingRef.current.answer)}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

function CueCardStep({
  topic,
  text,
  typedMode,
  disabled,
  onBeforeStart,
  onFinish,
}: {
  topic: string;
  text: string;
  typedMode: boolean;
  disabled: boolean;
  onBeforeStart: () => void;
  onFinish: (a: AnswerResult) => void;
}) {
  const [phase, setPhase] = useState<"prep" | "speak">("prep");
  const [prepLeft, setPrepLeft] = useState(PREP_SECONDS);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (phase !== "prep") return;
    if (prepLeft <= 0) {
      setPhase("speak");
      return;
    }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, prepLeft]);

  const [head, ...rest] = text.split("\n");

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border-2 border-ink bg-surface p-6">
        <Badge tone="primary">Part 2 · Cue card</Badge>
        <p className="mt-4 font-display text-xl leading-snug text-ink">{head}</p>
        <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">{rest.join("\n")}</div>
      </div>

      {phase === "prep" ? (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
              <Clock className="h-4 w-4 text-primary" /> Preparation time
            </span>
            <span className="font-display text-2xl text-primary" aria-live="off">
              {formatTime(prepLeft)}
            </span>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            aria-label="Your notes"
            placeholder="Jot down a few key words to help you speak (these notes are not saved)."
            className="mt-3 min-h-24 w-full resize-y rounded-lg border border-border bg-bg p-3 text-sm text-ink outline-none focus:border-primary"
          />
          <Button onClick={() => setPhase("speak")} className="mt-3">
            I'm ready — start speaking
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="mb-4 text-sm text-ink-soft">Speak for up to two minutes. Say as much as you can — the recording stops automatically.</p>
          <AnswerRecorder typed={typedMode} autoStart maxSeconds={TALK_SECONDS} onBeforeStart={onBeforeStart} onFinish={onFinish} disabled={disabled} />
        </div>
      )}
    </div>
  );
}

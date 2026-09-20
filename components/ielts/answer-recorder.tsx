"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square, Send, Keyboard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSpeechRecognition, useSpeechSupport } from "@/hooks/use-speech-recognition";

export type AnswerResult = {
  transcript: string;
  durationSeconds: number;
  pauseCount: number;
  totalPauseMs: number;
  typed: boolean;
};

function formatTime(total: number) {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

const ERROR_MESSAGES = {
  denied: "Microphone access was blocked. Allow it in your browser's address bar, or type your answer instead.",
  "no-mic": "No microphone was found. Connect one, or type your answer instead.",
  network: "Speech recognition couldn't reach its service. Check your connection, or type your answer instead.",
  unknown: "Speech recognition isn't working in this browser. You can type your answer instead.",
} as const;

export function AnswerRecorder({
  typed: typedProp,
  autoStart = false,
  maxSeconds,
  onBeforeStart,
  onFinish,
  disabled = false,
}: {
  typed: boolean;
  autoStart?: boolean;
  /** Ends the answer automatically (Part 2 speaking time). */
  maxSeconds?: number;
  onBeforeStart?: () => void;
  onFinish: (result: AnswerResult) => void;
  disabled?: boolean;
}) {
  const supported = useSpeechSupport();
  const speech = useSpeechRecognition();
  const [switchedToTyping, setSwitchedToTyping] = useState(false);
  const typed = typedProp || switchedToTyping;

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const secondsRef = useRef(0);
  secondsRef.current = seconds;
  const finishingRef = useRef(false);
  const autoStartedRef = useRef(false);
  const typedTextRef = useRef("");
  typedTextRef.current = typedText;

  const active = typed || recording;

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [active]);

  const startRecording = useCallback(() => {
    onBeforeStart?.();
    setNotice(null);
    finishingRef.current = false;
    setSeconds(0);
    speech.start();
    setRecording(true);
  }, [onBeforeStart, speech]);

  useEffect(() => {
    if (autoStart && supported && !typed && !autoStartedRef.current) {
      autoStartedRef.current = true;
      startRecording();
    }
  }, [autoStart, supported, typed, startRecording]);

  // Fall back to typing if recognition fails after we started.
  useEffect(() => {
    if (speech.error && recording) {
      setRecording(false);
      setNotice(ERROR_MESSAGES[speech.error]);
    }
  }, [speech.error, recording]);

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    if (typed) {
      onFinish({ transcript: typedTextRef.current.trim(), durationSeconds: secondsRef.current, pauseCount: 0, totalPauseMs: 0, typed: true });
      return;
    }

    const result = await speech.stop();
    setRecording(false);
    if (!result.transcript) {
      finishingRef.current = false;
      setSeconds(0);
      setNotice("We didn't catch any speech. Check your microphone and try again, or skip this question.");
      return;
    }
    onFinish({ ...result, durationSeconds: secondsRef.current, typed: false });
  }, [typed, speech, onFinish]);

  useEffect(() => {
    if (maxSeconds && active && seconds >= maxSeconds) finish();
  }, [maxSeconds, active, seconds, finish]);

  const skip = () => onFinish({ transcript: "", durationSeconds: 0, pauseCount: 0, totalPauseMs: 0, typed });

  const timeLabel = maxSeconds ? `${formatTime(Math.max(0, maxSeconds - seconds))} left` : formatTime(seconds);

  if (typed) {
    return (
      <div className="flex flex-col gap-3">
        {typedProp && (
          <p className="flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2 text-xs text-ink-soft">
            <Keyboard className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Voice recording isn't available here, so type your answer as if you were speaking. Fluency and pronunciation can't be judged from typed text.
          </p>
        )}
        <textarea
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          aria-label="Your answer"
          placeholder="Type your answer…"
          className="min-h-32 w-full resize-y rounded-xl border border-border bg-surface p-3 text-sm text-ink outline-none focus:border-primary"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-soft">{timeLabel}</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={skip} disabled={disabled}>
              Skip
            </Button>
            <Button onClick={finish} disabled={disabled || typedText.trim().length === 0}>
              <Send className="h-4 w-4" /> Submit answer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {notice && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
        </p>
      )}

      {recording ? (
        <>
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-30" />
              <Mic className="relative h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">Listening…</p>
              <p className="text-xs text-ink-soft">{timeLabel}</p>
            </div>
          </div>
          <div
            aria-live="polite"
            aria-label="Live transcript"
            className={cn(
              "min-h-24 rounded-xl border border-border bg-surface p-3 text-sm leading-relaxed",
              speech.liveText ? "text-ink" : "text-ink-soft"
            )}
          >
            {speech.liveText || "Start speaking — your words will appear here."}
          </div>
          <Button onClick={finish} disabled={disabled} className="self-start">
            <Square className="h-4 w-4" /> Finish answer
          </Button>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={startRecording} disabled={disabled || supported === false} size="lg">
            <Mic className="h-4 w-4" /> Start answering
          </Button>
          <Button variant="ghost" onClick={skip} disabled={disabled}>
            Skip question
          </Button>
          <Button variant="ghost" onClick={() => setSwitchedToTyping(true)} disabled={disabled}>
            <Keyboard className="h-4 w-4" /> Type instead
          </Button>
        </div>
      )}
    </div>
  );
}

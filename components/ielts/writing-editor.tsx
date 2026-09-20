"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Save, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MIN_SUBMIT_WORDS, MIN_WORDS, SUGGESTED_MINUTES, WRITING_CATEGORY_LABELS, countWords, type TaskType } from "@/lib/ielts/writing";

type Prompt = {
  taskType: TaskType;
  category: string;
  promptText: string;
  imageUrl: string | null;
  visualDescription: string | null;
};

type SaveState = "saved" | "saving" | "unsaved" | "error";

export function WritingEditor({
  submissionId,
  prompt,
  initialContent,
  initialTimeSpentSeconds,
}: {
  submissionId: string;
  prompt: Prompt;
  initialContent: string;
  initialTimeSpentSeconds: number;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [seconds, setSeconds] = useState(initialTimeSpentSeconds);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentRef = useRef(content);
  contentRef.current = content;
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;
  const dirtyRef = useRef(false);
  const submittingRef = useRef(false);

  const words = countWords(content);
  const minWords = MIN_WORDS[prompt.taskType];
  const suggestedSeconds = SUGGESTED_MINUTES[prompt.taskType] * 60;
  const canSubmit = words >= MIN_SUBMIT_WORDS;

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const save = useCallback(async () => {
    if (submittingRef.current) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/ielts/writing/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentRef.current, timeSpentSeconds: secondsRef.current }),
      });
      if (!res.ok) throw new Error();
      dirtyRef.current = false;
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [submissionId]);

  // Auto-save 2s after the student stops typing.
  useEffect(() => {
    if (!dirtyRef.current) return;
    const t = setTimeout(save, 2000);
    return () => clearTimeout(t);
  }, [content, save]);

  const onChange = (value: string) => {
    dirtyRef.current = true;
    setSaveState("unsaved");
    setContent(value);
  };

  const submit = async () => {
    setError(null);
    submittingRef.current = true;
    setSubmitting(true);
    const res = await fetch(`/api/ielts/writing/${submissionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: contentRef.current, timeSpentSeconds: secondsRef.current }),
    }).catch(() => null);

    if (res?.ok) {
      router.push(`/dashboard/ielts/writing/submission/${submissionId}`);
      return;
    }
    const data = await res?.json().catch(() => null);
    setError(data?.error ?? "Something went wrong. Your draft is safe — please try again.");
    submittingRef.current = false;
    setSubmitting(false);
  };

  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const overTime = seconds > suggestedSeconds;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">{prompt.taskType === "TASK1" ? "Task 1" : "Task 2"}</Badge>
            <Badge tone="neutral">{WRITING_CATEGORY_LABELS[prompt.category] ?? prompt.category}</Badge>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">{prompt.promptText}</p>
          <p className="mt-3 text-xs text-ink-soft">
            Write at least {minWords} words · suggested time {SUGGESTED_MINUTES[prompt.taskType]} minutes
          </p>
        </div>
        {prompt.imageUrl && (
          <div className="rounded-xl border border-border bg-surface p-3">
            <img src={prompt.imageUrl} alt={prompt.visualDescription ?? "Task 1 visual"} className="w-full rounded-lg" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
          <span className={cn("flex items-center gap-1.5 text-sm font-medium", words >= minWords ? "text-success" : "text-ink")}>
            {words} / {minWords} words
          </span>
          <div className="flex items-center gap-4 text-sm">
            <span className={cn("flex items-center gap-1.5", overTime ? "text-danger" : "text-ink-soft")}>
              <Clock className="h-4 w-4" />
              {mm}:{String(ss).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "flex items-center gap-1 text-xs",
                saveState === "error" ? "text-danger" : "text-ink-soft"
              )}
              aria-live="polite"
            >
              {saveState === "saved" && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Draft saved
                </>
              )}
              {saveState === "saving" && "Saving…"}
              {saveState === "unsaved" && "Unsaved changes"}
              {saveState === "error" && (
                <>
                  <AlertCircle className="h-3.5 w-3.5" /> Couldn't save
                </>
              )}
            </span>
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Start writing your response here…"
          aria-label="Your response"
          spellCheck
          className="min-h-[24rem] w-full resize-y rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed text-ink outline-none focus:border-primary"
        />

        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-soft">
            {canSubmit
              ? words < minWords
                ? `You're below the ${minWords}-word minimum, which will limit your task score.`
                : "Ready when you are."
              : `Write at least ${MIN_SUBMIT_WORDS} words to submit for feedback.`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={save} disabled={saveState === "saving" || submitting}>
              <Save className="h-4 w-4" /> Save draft
            </Button>
            <Button onClick={submit} loading={submitting} disabled={!canSubmit}>
              <Send className="h-4 w-4" /> {submitting ? "Getting feedback…" : "Submit for AI feedback"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

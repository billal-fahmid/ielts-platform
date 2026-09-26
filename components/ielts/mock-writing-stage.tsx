"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MIN_SUBMIT_WORDS, MIN_WORDS, SUGGESTED_MINUTES, WRITING_CATEGORY_LABELS, countWords, type TaskType } from "@/lib/ielts/writing";

export type MockWritingTask = {
  submissionId: string;
  taskType: TaskType;
  category: string;
  promptText: string;
  imageUrl: string | null;
  visualDescription: string | null;
  content: string;
};

type SaveState = "saved" | "saving" | "unsaved" | "error";

const TASK_LABEL: Record<TaskType, string> = { TASK1: "Task 1", TASK2: "Task 2" };

/** Both writing tasks under one 60-minute countdown that runs on a server-set deadline. */
export function MockWritingStage({
  remainingSeconds,
  tasks,
  onFinish,
}: {
  remainingSeconds: number;
  tasks: MockWritingTask[];
  /** Resolves to an error message, or null when the essays were handed in. */
  onFinish: (essays: { task1: string; task2: string }) => Promise<string | null>;
}) {
  const [active, setActive] = useState(0);
  const [contents, setContents] = useState(() => tasks.map((t) => t.content));
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [secondsLeft, setSecondsLeft] = useState(remainingSeconds);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deadlineRef = useRef(Date.now() + remainingSeconds * 1000);
  const contentsRef = useRef(contents);
  contentsRef.current = contents;
  const dirtyRef = useRef<boolean[]>(tasks.map(() => false));
  const finishedRef = useRef(false);

  const wordCounts = contents.map(countWords);
  const task = tasks[active];
  const minWords = MIN_WORDS[task.taskType];

  const saveAll = useCallback(async () => {
    if (finishedRef.current) return;
    const dirty = dirtyRef.current.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
    if (!dirty.length) return;
    setSaveState("saving");
    try {
      await Promise.all(
        dirty.map(async (i) => {
          const sentContent = contentsRef.current[i];
          const res = await fetch(`/api/ielts/writing/${tasks[i].submissionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: sentContent,
              timeSpentSeconds: Math.max(0, 3600 - Math.round((deadlineRef.current - Date.now()) / 1000)),
            }),
          });
          if (!res.ok && res.status !== 409) throw new Error("save failed");
          // Only clear the flag if nothing was typed while the request was in flight.
          if (contentsRef.current[i] === sentContent) dirtyRef.current[i] = false;
        })
      );
      setSaveState(dirtyRef.current.some(Boolean) ? "unsaved" : "saved");
    } catch {
      setSaveState("error");
    }
  }, [tasks]);

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSubmitting(true);
    setError(null);
    const message = await onFinish({ task1: contentsRef.current[0] ?? "", task2: contentsRef.current[1] ?? "" });
    if (message) {
      finishedRef.current = false;
      setSubmitting(false);
      setError(message);
    }
  }, [onFinish]);

  // The countdown is computed from the deadline, so a throttled background tab can't drift.
  useEffect(() => {
    const t = setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) finish();
  }, [secondsLeft, finish]);

  // Auto-save shortly after typing stops, and on a slow heartbeat as a safety net.
  useEffect(() => {
    const t = setTimeout(saveAll, 2000);
    return () => clearTimeout(t);
  }, [contents, saveAll]);

  useEffect(() => {
    const t = setInterval(saveAll, 15000);
    return () => clearInterval(t);
  }, [saveAll]);

  const onChange = (value: string) => {
    dirtyRef.current[active] = true;
    setSaveState("unsaved");
    setContents((c) => c.map((x, i) => (i === active ? value : x)));
  };

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const short = wordCounts.flatMap((w, i) => (w < MIN_SUBMIT_WORDS ? [TASK_LABEL[tasks[i].taskType]] : []));

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium text-ink">IELTS Writing</p>
          <p className="text-xs text-ink-soft">Task 1 and Task 2 share one 60-minute clock</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={cn("flex items-center gap-1.5 text-sm font-medium", secondsLeft <= 300 ? "text-danger" : "text-ink")} data-testid="writing-timer">
            <Clock className="h-4 w-4" />
            {mm}:{String(ss).padStart(2, "0")}
          </span>
          <Button size="sm" onClick={() => setConfirming(true)} disabled={submitting || confirming}>
            <Send className="h-4 w-4" /> Finish Writing
          </Button>
        </div>
      </div>

      {confirming && (
        <div role="alertdialog" aria-label="Finish Writing?" className="flex flex-col gap-3 rounded-xl border-2 border-primary bg-surface p-4">
          <p className="text-sm font-medium text-ink">Hand in both essays and move on to Speaking?</p>
          <p className="text-sm text-ink-soft">
            You can&apos;t come back to Writing afterwards.
            {short.length > 0 && (
              <span className="mt-1 block text-danger">
                {short.join(" and ")} {short.length > 1 ? "have" : "has"} fewer than {MIN_SUBMIT_WORDS} words and will score 0.
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={finish} loading={submitting}>
              Yes, hand in
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>
              Keep writing
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div role="tablist" aria-label="Writing tasks" className="flex gap-2">
        {tasks.map((t, i) => (
          <button
            key={t.submissionId}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "flex flex-1 flex-col items-center rounded-lg border py-2 text-sm font-medium",
              i === active ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft"
            )}
          >
            {TASK_LABEL[t.taskType]}
            <span className={cn("text-xs font-normal", wordCounts[i] >= MIN_WORDS[t.taskType] ? "text-success" : "")}>
              {wordCounts[i]} / {MIN_WORDS[t.taskType]} words
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <div className="flex flex-col gap-4 lg:sticky lg:top-36">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="primary">{TASK_LABEL[task.taskType]}</Badge>
              <Badge tone="neutral">{WRITING_CATEGORY_LABELS[task.category] ?? task.category}</Badge>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">{task.promptText}</p>
            <p className="mt-3 text-xs text-ink-soft">
              Write at least {minWords} words · suggested time {SUGGESTED_MINUTES[task.taskType]} minutes
            </p>
          </div>
          {task.imageUrl && (
            <div className="rounded-xl border border-border bg-surface p-3">
              <img loading="lazy" decoding="async" src={task.imageUrl} alt={task.visualDescription ?? "Task 1 visual"} className="w-full rounded-lg" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <textarea
            key={task.submissionId}
            value={contents[active]}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Start writing your response here…"
            aria-label={`Your response to ${TASK_LABEL[task.taskType]}`}
            className="min-h-[24rem] w-full resize-y rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed text-ink outline-none focus:border-primary"
          />
          <span className={cn("flex items-center gap-1 self-end text-xs", saveState === "error" ? "text-danger" : "text-ink-soft")} aria-live="polite">
            {saveState === "saved" && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Draft saved
              </>
            )}
            {saveState === "saving" && "Saving…"}
            {saveState === "unsaved" && "Unsaved changes"}
            {saveState === "error" && (
              <>
                <AlertCircle className="h-3.5 w-3.5" /> Couldn&apos;t save — keep this tab open
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

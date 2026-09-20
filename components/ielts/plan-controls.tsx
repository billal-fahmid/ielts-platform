"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, RefreshCw, Sparkles, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Builds a new 7-day plan. `replacing` asks first, because a new plan starts with every task unticked. */
export function GeneratePlanButton({ replacing, label }: { replacing?: boolean; label?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setConfirming(false);
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/ielts/study-plan", { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      setError(data?.error ?? "We couldn't create your plan. Please try again.");
      return;
    }
    if (data?.message) setMessage(data.message);
    router.push("/dashboard/ielts/plan");
    router.refresh();
  };

  if (confirming) {
    return (
      <div role="alertdialog" aria-label="Replace your plan?" className="flex flex-col items-start gap-2 rounded-lg border border-border bg-surface p-3">
        <p className="text-sm text-ink">Create a new plan? Your ticks on the current plan won&apos;t carry over.</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={run}>
            Yes, create a new plan
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={() => (replacing ? setConfirming(true) : run())} loading={loading} variant={replacing ? "outline" : "primary"}>
        {replacing ? <RefreshCw className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
        {loading ? "Building your plan…" : (label ?? (replacing ? "Create a new plan" : "Create my 7-day plan"))}
      </Button>
      {loading && <p className="text-xs text-ink-soft">This can take up to a minute while the coach writes your notes.</p>}
      {message && (
        <p role="status" className="text-xs text-ink-soft">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Retries the AI coach notes for a plan that was saved without them. */
export function AddNotesButton({ planId }: { planId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/ielts/study-plan/${planId}/notes`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (data?.added) router.refresh();
    else setMessage(data?.message ?? "Coach notes are still unavailable. Please try again later.");
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" size="sm" onClick={run} loading={loading}>
        <Sparkles className="h-4 w-4" /> {loading ? "Writing notes…" : "Add AI coach notes"}
      </Button>
      {message && (
        <p role="status" className="text-xs text-ink-soft">
          {message}
        </p>
      )}
    </div>
  );
}

/** A task's tick box. The tick shows immediately and is rolled back if saving fails. */
export function TaskCheck({ planId, taskId, initial, label }: { planId: string; taskId: string; initial: boolean; label: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState(initial);
  const [failed, setFailed] = useState(false);

  // Follow the server: a refreshed or replaced plan can reuse this box for a different task.
  useEffect(() => {
    setChecked(initial);
    setFailed(false);
  }, [planId, taskId, initial]);

  const toggle = async () => {
    const next = !checked;
    setChecked(next);
    setFailed(false);
    const res = await fetch(`/api/ielts/study-plan/${planId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: next }),
    }).catch(() => null);
    if (!res?.ok) {
      setChecked(!next);
      setFailed(true);
      return;
    }
    router.refresh();
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`Mark done: ${label}`}
      onClick={toggle}
      title={failed ? "Couldn't save, try again" : undefined}
      className={cn(
        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
        checked ? "border-primary bg-primary text-white" : "border-border bg-surface hover:border-primary",
        failed && "border-danger"
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}

/** Hides a suggestion the student doesn't want. */
export function DismissRecommendation({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const dismiss = async () => {
    setBusy(true);
    const res = await fetch(`/api/ielts/recommendations/${id}/dismiss`, { method: "POST" }).catch(() => null);
    if (res?.ok) router.refresh();
    else setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={dismiss}
      disabled={busy}
      aria-label={`Dismiss: ${title}`}
      className="rounded-md p-1 text-ink-soft hover:bg-primary-soft hover:text-ink disabled:opacity-50"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

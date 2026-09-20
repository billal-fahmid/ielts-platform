"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Asks the server to mark Writing and Speaking with the AI as soon as the results page opens.
 * If the AI is busy or unavailable the objective bands are already shown, and this offers a retry.
 */
export function FinalizeMock({ attemptId, pendingLabel }: { attemptId: string; pendingLabel: string }) {
  const router = useRouter();
  const [state, setState] = useState<"working" | "failed">("working");
  const [pending, setPending] = useState<string[]>([]);
  const started = useRef(false);

  const run = useCallback(async () => {
    setState("working");
    const res = await fetch(`/api/ielts/mock-test/${attemptId}/finalize`, { method: "POST" }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.complete) {
      router.refresh();
      return;
    }
    setPending(Array.isArray(data?.pending) ? data.pending : []);
    setState("failed");
    router.refresh(); // show any section that did get marked
  }, [attemptId, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  if (state === "working") {
    return (
      <div role="status" className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-ink">
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
        <div>
          <p className="font-medium">Marking your {pendingLabel}…</p>
          <p className="text-xs text-ink-soft">The AI is reading your essays and speaking answers. This can take up to a minute.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-ink">
        {pending.length ? `We couldn't mark ${pending.join(" and ")} just now.` : "We couldn't finish marking just now."} Your answers are saved, and Listening and Reading
        are already scored. The overall band appears once everything is marked.
      </p>
      <Button variant="outline" onClick={run}>
        <RefreshCw className="h-4 w-4" /> Try marking again
      </Button>
    </div>
  );
}

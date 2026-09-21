"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { send } from "@/lib/teaching/client";
import { BAND_OPTIONS } from "@/lib/reviews/rules";

/** Picks a queued writing review up, then opens it. */
export function ClaimButton({ reviewId, label = "Pick this up" }: { reviewId: string; label?: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const claim = async () => {
    setBusy(true);
    const r = await send(`/api/teacher/reviews/${reviewId}/claim`, "POST");
    setBusy(false);
    if (!r.ok) {
      push(r.json.error || "Could not pick this up", "error");
      router.refresh();
      return;
    }
    push("It's yours. Read the essay and write your feedback.", "success");
    router.push(`/teacher/reviews/${reviewId}`);
    router.refresh();
  };
  return (
    <Button size="sm" onClick={claim} loading={busy}>
      {label}
    </Button>
  );
}

export function ReleaseButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const release = async () => {
    if (!confirm("Put this review back in the queue? Anything you wrote for it will be discarded.")) return;
    setBusy(true);
    const r = await send(`/api/teacher/reviews/${reviewId}/release`, "POST");
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not put it back", "error");
    push("Put back in the queue", "success");
    router.push("/teacher/reviews");
    router.refresh();
  };
  return (
    <Button variant="outline" size="sm" onClick={release} loading={busy}>
      <Undo2 className="h-3.5 w-3.5" /> Put back in queue
    </Button>
  );
}

type Values = { bandEstimate: number | null; taskResponseFeedback: string | null; coherenceFeedback: string | null; vocabularyFeedback: string | null; grammarFeedback: string | null; overallComments: string | null };

/** The teacher's review: a band estimate, feedback on each criterion, and overall comments. */
export function ReviewForm({ reviewId, initial, taskLabel, completed }: { reviewId: string; initial: Values; taskLabel: string; completed: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [v, setV] = useState({
    band: initial.bandEstimate === null ? "" : String(initial.bandEstimate),
    tr: initial.taskResponseFeedback ?? "",
    cc: initial.coherenceFeedback ?? "",
    lr: initial.vocabularyFeedback ?? "",
    gra: initial.grammarFeedback ?? "",
    overall: initial.overallComments ?? "",
  });
  const [busy, setBusy] = useState<"save" | "complete" | null>(null);
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));

  const submit = async (complete: boolean) => {
    setBusy(complete ? "complete" : "save");
    const r = await send(`/api/teacher/reviews/${reviewId}`, "PATCH", {
      bandEstimate: v.band === "" ? null : Number(v.band),
      taskResponseFeedback: v.tr || null,
      coherenceFeedback: v.cc || null,
      vocabularyFeedback: v.lr || null,
      grammarFeedback: v.gra || null,
      overallComments: v.overall || null,
      complete,
    });
    setBusy(null);
    if (!r.ok) return push(r.json.error || "Could not save the review", "error");
    push(complete ? "Review sent to the student" : completed ? "Review updated" : "Draft saved", "success");
    router.refresh();
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(!completed);
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Band estimate" hint="Your own estimate, from 0 to 9 in half bands. It is shown to the student as your estimate, not an official score.">
        <Select value={v.band} onChange={(e) => set("band", e.target.value)} data-testid="band-select">
          <option value="">Choose…</option>
          {BAND_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {b.toFixed(1)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={`${taskLabel} feedback`}>
        <Textarea rows={3} value={v.tr} onChange={(e) => set("tr", e.target.value)} maxLength={5000} />
      </Field>
      <Field label="Coherence and cohesion feedback">
        <Textarea rows={3} value={v.cc} onChange={(e) => set("cc", e.target.value)} maxLength={5000} />
      </Field>
      <Field label="Vocabulary feedback">
        <Textarea rows={3} value={v.lr} onChange={(e) => set("lr", e.target.value)} maxLength={5000} />
      </Field>
      <Field label="Grammar feedback">
        <Textarea rows={3} value={v.gra} onChange={(e) => set("gra", e.target.value)} maxLength={5000} />
      </Field>
      <Field label="Overall comments" hint="The first thing the student reads. Say what to work on next.">
        <Textarea rows={4} value={v.overall} onChange={(e) => set("overall", e.target.value)} maxLength={5000} />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        {completed ? (
          <Button type="submit" loading={busy === "save"}>
            Update review
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={() => submit(false)} loading={busy === "save"}>
              Save draft
            </Button>
            <Button type="submit" loading={busy === "complete"}>
              Finish and send to student
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

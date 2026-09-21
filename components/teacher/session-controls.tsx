"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Trash2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { send } from "@/lib/teaching/client";
import { BAND_OPTIONS, SLOT_DURATIONS, suggestOverallBand } from "@/lib/reviews/rules";

/** Publish a bookable time. The time is typed in Bangladesh time. */
export function NewSlotForm({ defaultMeetingUrl }: { defaultMeetingUrl: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [when, setWhen] = useState("");
  const [minutes, setMinutes] = useState("15");
  const [url, setUrl] = useState(defaultMeetingUrl);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await send("/api/teacher/sessions", "POST", { startsAtLocal: when, durationMinutes: Number(minutes), meetingUrl: url });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not add the slot", "error");
    push("Slot published. Students can book it now.", "success");
    setWhen("");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Date and time (Bangladesh time)">
        <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
      </Field>
      <Field label="Length">
        <Select value={minutes} onChange={(e) => setMinutes(e.target.value)}>
          {SLOT_DURATIONS.map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Meeting link" hint="Zoom, Google Meet or similar. Only the student who books can see it.">
          <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" required />
        </Field>
      </div>
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" loading={busy}>
          Publish slot
        </Button>
      </div>
    </form>
  );
}

export function CancelSlotButton({ slotId, booked, studentName, redirectTo }: { slotId: string; booked: boolean; studentName?: string | null; redirectTo?: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    let reason = "";
    if (booked) {
      const answer = window.prompt(`Cancel this session? ${studentName ?? "The student"} will be told. Reason (optional):`, "");
      if (answer === null) return;
      reason = answer;
    } else if (!confirm("Remove this open slot?")) return;
    setBusy(true);
    const r = await send(`/api/teacher/sessions/${slotId}${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`, "DELETE");
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not cancel", "error");
    push(booked ? "Session cancelled. The student has been told." : "Slot removed", "success");
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  };
  return (
    <button onClick={cancel} disabled={busy} aria-label={booked ? "Cancel session" : "Remove slot"} className="rounded-md p-1.5 text-ink-soft hover:bg-danger-soft hover:text-danger disabled:opacity-50">
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

export function StartSessionButton({ slotId, disabledReason }: { slotId: string; disabledReason?: string | null }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    const r = await send(`/api/teacher/sessions/${slotId}/start`, "POST");
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not start the session", "error");
    push("Session started. The student has been told to join.", "success");
    router.refresh();
  };
  return (
    <div>
      <Button onClick={start} loading={busy} disabled={!!disabledReason}>
        <Play className="h-4 w-4" /> Start session
      </Button>
      {disabledReason && <p className="mt-1 text-xs text-ink-soft">{disabledReason}</p>}
    </div>
  );
}

export function NoShowButton({ slotId }: { slotId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const mark = async () => {
    if (!confirm("Mark this student as not attending?")) return;
    setBusy(true);
    const r = await send(`/api/teacher/sessions/${slotId}/no-show`, "POST");
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not update the session", "error");
    push("Marked as not attended", "success");
    router.refresh();
  };
  return (
    <Button variant="outline" onClick={mark} loading={busy}>
      <UserX className="h-4 w-4" /> Student didn&apos;t attend
    </Button>
  );
}

type Values = { teacherNotes: string | null; fluencyBand: number | null; lexicalBand: number | null; grammarBand: number | null; pronunciationBand: number | null; overallBand: number | null; feedback: string | null };

const bandOptions = BAND_OPTIONS.map((b) => (
  <option key={b} value={b}>
    {b.toFixed(1)}
  </option>
));

/** Private notes, the four IELTS speaking criteria, an overall band and feedback for the student. */
export function SessionForm({ slotId, initial, completed }: { slotId: string; initial: Values; completed: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const str = (n: number | null) => (n === null ? "" : String(n));
  const [v, setV] = useState({ notes: initial.teacherNotes ?? "", fl: str(initial.fluencyBand), lx: str(initial.lexicalBand), gr: str(initial.grammarBand), pr: str(initial.pronunciationBand), overall: str(initial.overallBand), feedback: initial.feedback ?? "" });
  const [busy, setBusy] = useState<"save" | "complete" | null>(null);
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));
  const num = (s: string) => (s === "" ? null : Number(s));

  const suggested = suggestOverallBand([num(v.fl), num(v.lx), num(v.gr), num(v.pr)].filter((n): n is number => n !== null).length === 4 ? [Number(v.fl), Number(v.lx), Number(v.gr), Number(v.pr)] : []);

  const submit = async (complete: boolean) => {
    setBusy(complete ? "complete" : "save");
    const r = await send(`/api/teacher/sessions/${slotId}`, "PATCH", {
      teacherNotes: v.notes || null,
      fluencyBand: num(v.fl),
      lexicalBand: num(v.lx),
      grammarBand: num(v.gr),
      pronunciationBand: num(v.pr),
      overallBand: num(v.overall),
      feedback: v.feedback || null,
      complete,
    });
    setBusy(null);
    if (!r.ok) return push(r.json.error || "Could not save", "error");
    push(complete ? "Feedback sent to the student" : completed ? "Session updated" : "Draft saved", "success");
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
      <Field label="Your notes (private)" hint="Only you can see these. Use them during the session.">
        <Textarea rows={4} value={v.notes} onChange={(e) => set("notes", e.target.value)} maxLength={5000} />
      </Field>
      <div className="grid grid-cols-2 items-end gap-4 sm:grid-cols-4">
        <Field label="Fluency and coherence">
          <Select value={v.fl} onChange={(e) => set("fl", e.target.value)}>
            <option value="">—</option>
            {bandOptions}
          </Select>
        </Field>
        <Field label="Lexical resource">
          <Select value={v.lx} onChange={(e) => set("lx", e.target.value)}>
            <option value="">—</option>
            {bandOptions}
          </Select>
        </Field>
        <Field label="Grammar range and accuracy">
          <Select value={v.gr} onChange={(e) => set("gr", e.target.value)}>
            <option value="">—</option>
            {bandOptions}
          </Select>
        </Field>
        <Field label="Pronunciation">
          <Select value={v.pr} onChange={(e) => set("pr", e.target.value)}>
            <option value="">—</option>
            {bandOptions}
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Field label="Overall band">
            <Select value={v.overall} onChange={(e) => set("overall", e.target.value)} data-testid="overall-band">
              <option value="">—</option>
              {bandOptions}
            </Select>
          </Field>
        </div>
        {suggested !== null && (
          <Button type="button" variant="outline" size="sm" onClick={() => set("overall", String(suggested))}>
            Use the average: {suggested.toFixed(1)}
          </Button>
        )}
      </div>
      <Field label="Feedback for the student" hint="Shown to the student with the scores. Scores are your own estimates, not official IELTS results.">
        <Textarea rows={5} value={v.feedback} onChange={(e) => set("feedback", e.target.value)} maxLength={5000} />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        {completed ? (
          <Button type="submit" loading={busy === "save"}>
            Update session
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={() => submit(false)} loading={busy === "save"}>
              Save draft
            </Button>
            <Button type="submit" loading={busy === "complete"}>
              Finish and send feedback
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

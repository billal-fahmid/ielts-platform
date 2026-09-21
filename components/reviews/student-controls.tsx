"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { send } from "@/lib/teaching/client";

/** Ask a teacher to review one essay, with an optional note about what to look at. */
export function RequestReviewForm({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await send("/api/writing-reviews", "POST", { submissionId, note: note || null });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not send the request", "error");
    push("Sent. A teacher will pick it up and you'll be notified.", "success");
    router.refresh();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field label="Anything you want the teacher to look at? (optional)">
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="For example: my conclusion, or my use of linking words" />
      </Field>
      <div>
        <Button type="submit" loading={busy}>
          Ask a teacher to review this essay
        </Button>
      </div>
    </form>
  );
}

export function CancelRequestButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    if (!confirm("Withdraw this request?")) return;
    setBusy(true);
    const r = await send(`/api/writing-reviews/${reviewId}/cancel`, "POST");
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not withdraw the request", "error");
    push("Request withdrawn", "success");
    router.refresh();
  };
  return (
    <Button variant="outline" size="sm" onClick={cancel} loading={busy}>
      Withdraw request
    </Button>
  );
}

/** Books one open speaking slot. The note is optional and shared with the teacher. */
export function BookSlotButton({ slotId, when }: { slotId: string; when: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const book = async () => {
    setBusy(true);
    const r = await send(`/api/speaking-sessions/${slotId}/book`, "POST", { note: note || null });
    setBusy(false);
    if (!r.ok) {
      push(r.json.error || "Could not book that time", "error");
      if (r.status === 400) router.refresh();
      return;
    }
    push("Booked! You'll find the meeting link under My sessions.", "success");
    setOpen(false);
    router.refresh();
  };
  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)} aria-label={`Book ${when}`}>
        Book
      </Button>
    );
  }
  return (
    <div className="flex w-full flex-col gap-2 sm:w-72">
      <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="What do you want to practise? (optional)" aria-label="What do you want to practise?" />
      <div className="flex gap-2">
        <Button size="sm" onClick={book} loading={busy}>
          Confirm booking
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
          Not now
        </Button>
      </div>
    </div>
  );
}

export function CancelBookingButton({ slotId }: { slotId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    if (!confirm("Cancel this session? Your teacher will be told and the time becomes available to others.")) return;
    setBusy(true);
    const r = await send(`/api/speaking-sessions/${slotId}/cancel`, "POST");
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not cancel", "error");
    push("Session cancelled", "success");
    router.refresh();
  };
  return (
    <Button variant="outline" size="sm" onClick={cancel} loading={busy}>
      Cancel booking
    </Button>
  );
}

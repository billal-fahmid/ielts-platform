"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

/** The student's answer box: written text and, optionally, a link to work stored elsewhere. */
export function SubmitAssignmentForm({ assignmentId, initialText, initialLink, resubmitting, pastDue }: { assignmentId: string; initialText: string; initialLink: string; resubmitting: boolean; pastDue: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [text, setText] = useState(initialText);
  const [link, setLink] = useState(initialLink);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerText: text, linkUrl: link || null }),
    }).catch(() => null);
    setBusy(false);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) return push(json.error || "Couldn't reach the server. Try again.", "error");
    push(resubmitting ? "Your answer was updated" : pastDue ? "Handed in (after the due date)" : "Handed in. Your teacher has been told.", "success");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-4">
      <Field label="Write your answer">
        <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer here" maxLength={20000} />
      </Field>
      <Field label="Link (optional)" hint="For work stored elsewhere, such as a Google Drive or YouTube link. It must start with https://">
        <Input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={busy}>
          {resubmitting ? "Update my answer" : "Hand in"}
        </Button>
      </div>
    </form>
  );
}

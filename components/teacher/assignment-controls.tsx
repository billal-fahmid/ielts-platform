"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { UploadButton } from "@/components/admin/upload-button";

type Option = { id: string; label: string };
type AssignmentValues = { id?: string; title: string; instructions: string; batchId: string | null; courseId: string | null; attachmentUrl: string | null; dueAt: string | null; maxScore: number; published: boolean };

async function send(url: string, method: string, body?: unknown): Promise<{ ok: boolean; json: any }> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  if (!res) return { ok: false, json: { error: "Couldn't reach the server. Check your connection and try again." } };
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

/** Create or edit an assignment. `locked` is true once students have submitted (audience and scoring can't change then). */
export function AssignmentForm({ assignment, batches, courses, locked = false }: { assignment?: AssignmentValues; batches: Option[]; courses: Option[]; locked?: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [saving, setSaving] = useState(false);
  const [v, setV] = useState({
    title: assignment?.title ?? "",
    instructions: assignment?.instructions ?? "",
    audience: assignment?.batchId ? `batch:${assignment.batchId}` : assignment?.courseId ? `course:${assignment.courseId}` : "",
    attachmentUrl: assignment?.attachmentUrl ?? "",
    dueAt: assignment?.dueAt ?? "",
    maxScore: String(assignment?.maxScore ?? 100),
    published: assignment?.published ?? false,
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const [kind, targetId] = v.audience.split(":");
    const payload = {
      title: v.title,
      instructions: v.instructions,
      batchId: kind === "batch" ? targetId : null,
      courseId: kind === "course" ? targetId : null,
      attachmentUrl: v.attachmentUrl || null,
      dueAt: v.dueAt || null,
      maxScore: Number(v.maxScore),
      published: v.published,
    };
    const r = assignment?.id ? await send(`/api/teacher/assignments/${assignment.id}`, "PATCH", payload) : await send("/api/teacher/assignments", "POST", payload);
    setSaving(false);
    if (!r.ok) return push(r.json.error || "Could not save the assignment", "error");
    push(assignment?.id ? "Assignment saved" : v.published ? "Assignment published" : "Draft saved", "success");
    if (!assignment?.id && r.json.assignment?.id) router.push(`/teacher/assignments/${r.json.assignment.id}`);
    else router.refresh();
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Title">
          <Input value={v.title} onChange={(e) => set("title", e.target.value)} required maxLength={160} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Instructions" hint="What students should do. They see this exactly as written.">
          <Textarea rows={6} value={v.instructions} onChange={(e) => set("instructions", e.target.value)} required />
        </Field>
      </div>
      <Field label="Who is it for?" hint={locked ? "Locked: students have already submitted work." : "Every member of the batch, or every student enrolled in the course."}>
        <Select value={v.audience} onChange={(e) => set("audience", e.target.value)} required disabled={locked}>
          <option value="">Choose…</option>
          {batches.length > 0 && (
            <optgroup label="Batches">
              {batches.map((b) => (
                <option key={b.id} value={`batch:${b.id}`}>
                  {b.label}
                </option>
              ))}
            </optgroup>
          )}
          {courses.length > 0 && (
            <optgroup label="Courses (enrolled students)">
              {courses.map((c) => (
                <option key={c.id} value={`course:${c.id}`}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Due date (optional)">
          <Input type="date" value={v.dueAt} onChange={(e) => set("dueAt", e.target.value)} />
        </Field>
        <Field label="Maximum score" hint={locked ? "Locked." : undefined}>
          <Input type="number" min={1} max={1000} value={v.maxScore} onChange={(e) => set("maxScore", e.target.value)} disabled={locked} required />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Attachment (optional)" hint="A worksheet, audio or PDF students can open.">
          <Input value={v.attachmentUrl} onChange={(e) => set("attachmentUrl", e.target.value)} placeholder="/api/files/… or https://…" />
        </Field>
        <UploadButton kinds={["DOCUMENT", "AUDIO", "IMAGE"]} onUploaded={(url) => set("attachmentUrl", url)} />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
        <input type="checkbox" checked={v.published} onChange={(e) => set("published", e.target.checked)} className="h-4 w-4 accent-primary" />
        Published — students can see it {assignment?.id ? "" : "(they are notified when you publish)"}
      </label>
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" loading={saving}>
          {assignment?.id ? "Save changes" : v.published ? "Publish assignment" : "Save draft"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!confirm("Delete this assignment? This can't be undone.")) return;
    setBusy(true);
    const r = await send(`/api/teacher/assignments/${assignmentId}`, "DELETE");
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not delete the assignment", "error");
    push("Assignment deleted", "success");
    router.push("/teacher/assignments");
    router.refresh();
  };
  return (
    <Button variant="outline" size="sm" onClick={remove} loading={busy}>
      <Trash2 className="h-3.5 w-3.5" /> Delete
    </Button>
  );
}

/** Score and feedback for one student's submission. */
export function GradeForm({ assignmentId, submissionId, maxScore, initialScore, initialFeedback, graded }: { assignmentId: string; submissionId: string; maxScore: number; initialScore: number | null; initialFeedback: string | null; graded: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [score, setScore] = useState(initialScore != null ? String(initialScore) : "");
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await send(`/api/teacher/assignments/${assignmentId}/submissions/${submissionId}`, "PATCH", { score: score === "" ? NaN : Number(score), feedback: feedback || null });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not save the grade", "error");
    push("Grade saved. The student has been notified.", "success");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
      <Field label={`Score (0–${maxScore})`}>
        <Input type="number" min={0} max={maxScore} step={1} value={score} onChange={(e) => setScore(e.target.value)} required />
      </Field>
      <Field label="Feedback">
        <Textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What went well, and what to improve" />
      </Field>
      <Button type="submit" loading={busy}>
        {graded ? "Update grade" : "Save grade"}
      </Button>
    </form>
  );
}

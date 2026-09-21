"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type BatchValues = { id?: string; name: string; description: string | null; courseId: string | null; capacity: number | null; startsOn: string | null; endsOn: string | null; status?: "ACTIVE" | "ARCHIVED" };
type CourseOption = { id: string; title: string };

async function send(url: string, method: string, body?: unknown): Promise<{ ok: boolean; json: any }> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
  if (!res) return { ok: false, json: { error: "Couldn't reach the server. Check your connection and try again." } };
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

/** Create a batch, or edit one (when `batch` is given). */
export function BatchForm({ batch, courses, onDone }: { batch?: BatchValues; courses: CourseOption[]; onDone?: () => void }) {
  const router = useRouter();
  const { push } = useToast();
  const [saving, setSaving] = useState(false);
  const [v, setV] = useState({
    name: batch?.name ?? "",
    description: batch?.description ?? "",
    courseId: batch?.courseId ?? "",
    capacity: batch?.capacity != null ? String(batch.capacity) : "",
    startsOn: batch?.startsOn ?? "",
    endsOn: batch?.endsOn ?? "",
    status: batch?.status ?? "ACTIVE",
  });
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: v.name,
      description: v.description || null,
      courseId: v.courseId || null,
      capacity: v.capacity === "" ? null : Number(v.capacity),
      startsOn: v.startsOn || null,
      endsOn: v.endsOn || null,
      status: v.status as "ACTIVE" | "ARCHIVED",
    };
    const r = batch?.id ? await send(`/api/teacher/batches/${batch.id}`, "PATCH", payload) : await send("/api/teacher/batches", "POST", payload);
    setSaving(false);
    if (!r.ok) return push(r.json.error || "Could not save the batch", "error");
    push(batch?.id ? "Batch updated" : "Batch created", "success");
    if (!batch?.id) setV({ name: "", description: "", courseId: "", capacity: "", startsOn: "", endsOn: "", status: "ACTIVE" });
    onDone?.();
    if (!batch?.id && r.json.batch?.id) router.push(`/teacher/batches/${r.json.batch.id}`);
    else router.refresh();
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Batch name">
          <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. IELTS Evening Batch" required maxLength={100} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Description (optional)">
          <Textarea rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
        </Field>
      </div>
      <Field label="Course (optional)" hint="The course this batch follows.">
        <Select value={v.courseId} onChange={(e) => set("courseId", e.target.value)}>
          <option value="">No course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Capacity (optional)" hint="Most students the batch can hold.">
        <Input type="number" min={1} max={500} value={v.capacity} onChange={(e) => set("capacity", e.target.value)} />
      </Field>
      <Field label="Starts on">
        <Input type="date" value={v.startsOn} onChange={(e) => set("startsOn", e.target.value)} />
      </Field>
      <Field label="Ends on">
        <Input type="date" value={v.endsOn} onChange={(e) => set("endsOn", e.target.value)} />
      </Field>
      {batch?.id && (
        <Field label="Status">
          <Select value={v.status} onChange={(e) => set("status", e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </Field>
      )}
      <div className="flex items-end justify-end sm:col-span-2">
        <Button type="submit" loading={saving}>
          {batch?.id ? "Save changes" : "Create batch"}
        </Button>
      </div>
    </form>
  );
}

/** "New batch" button that reveals the create form. */
export function NewBatch({ courses }: { courses: CourseOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <div className="flex justify-end">
        <Button onClick={() => setOpen((o) => !o)} variant={open ? "outline" : "primary"}>
          <Plus className="h-4 w-4" /> {open ? "Cancel" : "New batch"}
        </Button>
      </div>
      {open && (
        <Card className="mt-4 p-5">
          <BatchForm courses={courses} />
        </Card>
      )}
    </div>
  );
}

export function DeleteBatchButton({ batchId }: { batchId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!confirm("Delete this batch? Its students stay on the platform, but they leave the batch.")) return;
    setBusy(true);
    const r = await send(`/api/teacher/batches/${batchId}`, "DELETE");
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not delete the batch", "error");
    push("Batch deleted", "success");
    router.push("/teacher/batches");
    router.refresh();
  };
  return (
    <Button variant="outline" size="sm" onClick={remove} loading={busy}>
      <Trash2 className="h-3.5 w-3.5" /> Delete batch
    </Button>
  );
}

export function AddMemberForm({ batchId, disabled }: { batchId: string; disabled?: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await send(`/api/teacher/batches/${batchId}/members`, "POST", { email });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not add the student", "error");
    push(`${r.json.member?.name ?? "Student"} added`, "success");
    setEmail("");
    router.refresh();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Field label="Add a student by email" hint="They need a BanglaEnglish student account.">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" required disabled={disabled} />
        </Field>
      </div>
      <Button type="submit" loading={busy} disabled={disabled}>
        <UserPlus className="h-4 w-4" /> Add
      </Button>
    </form>
  );
}

export function RemoveMemberButton({ batchId, studentId, name }: { batchId: string; studentId: string; name: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!confirm(`Remove ${name} from this batch?`)) return;
    setBusy(true);
    const r = await send(`/api/teacher/batches/${batchId}/members?studentId=${encodeURIComponent(studentId)}`, "DELETE");
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not remove the student", "error");
    push(`${name} removed`, "success");
    router.refresh();
  };
  return (
    <button onClick={remove} disabled={busy} aria-label={`Remove ${name}`} className="rounded-md p-1.5 text-ink-soft hover:bg-danger-soft hover:text-danger disabled:opacity-50">
      <UserMinus className="h-4 w-4" />
    </button>
  );
}

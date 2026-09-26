"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { UploadButton } from "@/components/admin/upload-button";
import { send } from "@/lib/teaching/client";
import { ATTENDANCE_LABELS, CLASS_DURATIONS } from "@/lib/classes/rules";

type Option = { id: string; label: string };
type ClassValues = { id?: string; title: string; description: string | null; batchId: string | null; courseId: string | null; startsAtLocal: string; durationMinutes: number; provider: string; meetingUrl: string };

/** Schedule a class, or edit one (when `cls` is given). Times are typed in Bangladesh time. */
export function ClassForm({ cls, batches, courses, locked = false, disabled = false }: { cls?: ClassValues; batches: Option[]; courses: Option[]; locked?: boolean; disabled?: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({
    title: cls?.title ?? "",
    description: cls?.description ?? "",
    audience: cls?.batchId ? `batch:${cls.batchId}` : cls?.courseId ? `course:${cls.courseId}` : "",
    when: cls?.startsAtLocal ?? "",
    minutes: String(cls?.durationMinutes ?? 60),
    provider: cls?.provider ?? "JITSI",
    url: cls?.meetingUrl && cls.provider === "MANUAL" ? cls.meetingUrl : "",
  });
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const [kind, targetId] = v.audience.split(":");
    const payload = {
      title: v.title,
      description: v.description || null,
      batchId: kind === "batch" ? targetId : null,
      courseId: kind === "course" ? targetId : null,
      startsAtLocal: v.when,
      durationMinutes: Number(v.minutes),
      provider: v.provider,
      meetingUrl: v.provider === "MANUAL" ? v.url : null,
    };
    const r = cls?.id ? await send(`/api/teacher/classes/${cls.id}`, "PATCH", payload) : await send("/api/teacher/classes", "POST", payload);
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not save the class", "error");
    push(cls?.id ? "Class updated" : "Class scheduled. Students have been told.", "success");
    if (!cls?.id && r.json.class?.id) router.push(`/teacher/classes/${r.json.class.id}`);
    else router.refresh();
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Title">
          <Input value={v.title} onChange={(e) => set("title", e.target.value)} required maxLength={120} disabled={disabled} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="What will you cover? (optional)">
          <Textarea rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} disabled={disabled} />
        </Field>
      </div>
      <Field label="Who is it for?" hint={locked ? "Locked: attendance has been recorded." : "Every member of the batch, or every student enrolled in the course."}>
        <Select value={v.audience} onChange={(e) => set("audience", e.target.value)} required disabled={locked || disabled}>
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
      <Field label="Date and time (Bangladesh time)">
        <Input type="datetime-local" value={v.when} onChange={(e) => set("when", e.target.value)} required disabled={disabled} />
      </Field>
      <Field label="Length">
        <Select value={v.minutes} onChange={(e) => set("minutes", e.target.value)} disabled={disabled}>
          {CLASS_DURATIONS.map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Where will it be held?">
        <Select value={v.provider} onChange={(e) => set("provider", e.target.value)} disabled={disabled}>
          <option value="JITSI">Create a Jitsi room (free, no account)</option>
          <option value="MANUAL">Paste a Zoom, Meet or Teams link</option>
        </Select>
      </Field>
      {v.provider === "MANUAL" && (
        <div className="sm:col-span-2">
          <Field label="Meeting link" hint="Only students in the class can see it, and only when they press Join.">
            <Input type="url" value={v.url} onChange={(e) => set("url", e.target.value)} placeholder="https://" required disabled={disabled} />
          </Field>
        </div>
      )}
      {!disabled && (
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" loading={busy}>
            {cls?.id ? "Save changes" : "Schedule class"}
          </Button>
        </div>
      )}
    </form>
  );
}

export function CancelClassButton({ classId }: { classId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const cancel = async () => {
    const reason = window.prompt("Cancel this class? Every student will be told. Reason (optional):", "");
    if (reason === null) return;
    setBusy(true);
    const r = await send(`/api/teacher/classes/${classId}${reason ? `?reason=${encodeURIComponent(reason)}` : ""}`, "DELETE");
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not cancel the class", "error");
    push("Class cancelled. Students have been told.", "success");
    router.refresh();
  };
  return (
    <Button variant="outline" size="sm" onClick={cancel} loading={busy}>
      <Trash2 className="h-3.5 w-3.5" /> Cancel class
    </Button>
  );
}

/** One student's attendance: a dropdown that saves as soon as it changes. */
export function AttendanceSelect({ classId, studentId, value, name }: { classId: string; studentId: string; value: string | null; name: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [v, setV] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  const change = async (next: string) => {
    const previous = v;
    setV(next);
    setBusy(true);
    const r = await send(`/api/teacher/classes/${classId}/attendance`, "PUT", { studentId, status: next === "" ? null : next });
    setBusy(false);
    if (!r.ok) {
      setV(previous);
      return push(r.json.error || "Could not save attendance", "error");
    }
    router.refresh();
  };
  return (
    <Select value={v} onChange={(e) => change(e.target.value)} disabled={busy} aria-label={`Attendance for ${name}`} className="w-36 py-1.5">
      <option value="">Not recorded</option>
      {Object.entries(ATTENDANCE_LABELS).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </Select>
  );
}

export function MaterialForm({ classId }: { classId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await send(`/api/teacher/classes/${classId}/materials`, "POST", { title, url });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not add the material", "error");
    push("Material added", "success");
    setTitle("");
    setUrl("");
    router.refresh();
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <Field label="Name">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Week 3 slides" required maxLength={120} />
      </Field>
      <div>
        <Field label="File or link">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/api/files/… or https://…" required />
        </Field>
        <UploadButton kinds={["DOCUMENT", "AUDIO", "VIDEO", "IMAGE"]} onUploaded={setUrl} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" loading={busy}>
          Add material
        </Button>
      </div>
    </form>
  );
}

export function RemoveMaterialButton({ classId, materialId, title }: { classId: string; materialId: string; title: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!confirm(`Remove “${title}”?`)) return;
    setBusy(true);
    const r = await send(`/api/teacher/classes/${classId}/materials?materialId=${encodeURIComponent(materialId)}`, "DELETE");
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not remove it", "error");
    router.refresh();
  };
  return (
    <button onClick={remove} disabled={busy} aria-label={`Remove ${title}`} className="rounded-md p-1.5 text-ink-soft hover:bg-danger-soft hover:text-danger disabled:opacity-50">
      <X className="h-4 w-4" />
    </button>
  );
}

export function RecordingForm({ classId, current }: { classId: string; current: string | null }) {
  const router = useRouter();
  const { push } = useToast();
  const [url, setUrl] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const save = async (value: string | null) => {
    setBusy(true);
    const r = await send(`/api/teacher/classes/${classId}/recording`, "PUT", { url: value });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not save the recording", "error");
    push(value ? "Recording saved" : "Recording removed", "success");
    if (!value) setUrl("");
    router.refresh();
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(url.trim() || null);
      }}
      className="flex flex-col gap-2"
    >
      <Field label="Recording link" hint="Paste the link from Zoom, Meet or YouTube, or upload the video. Students in the class can watch it.">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/api/files/… or https://…" />
      </Field>
      <UploadButton kinds={["VIDEO"]} onUploaded={setUrl} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={busy}>
          Save recording
        </Button>
        {current && (
          <Button type="button" size="sm" variant="outline" onClick={() => save(null)}>
            Remove
          </Button>
        )}
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select } from "@/components/ui/input";

export function BroadcastForm() {
  const [audience, setAudience] = useState("STUDENTS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/admin/notifications/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audience, title, body: body || undefined, url: url || undefined, email }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (res?.ok) {
      setResult({ ok: true, message: `Sent to ${data.sent} user${data.sent === 1 ? "" : "s"}.` });
      setTitle("");
      setBody("");
      setUrl("");
    } else {
      setResult({ ok: false, message: data?.error ?? "Could not send the announcement." });
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Send to">
        <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="STUDENTS">All students</option>
          <option value="TEACHERS">All teachers</option>
          <option value="ALL">Everyone</option>
        </Select>
      </Field>
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="New IELTS mock test available" />
      </Field>
      <Field label="Message (optional)">
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={500} />
      </Field>
      <Field label="Link (optional)" hint="A page on this site, for example /dashboard/ielts/mock-test">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/dashboard/ielts/mock-test" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="h-4 w-4 accent-primary" /> Also send by email (to users who have email notifications on)
      </label>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`rounded-lg px-3 py-2 text-sm ${result.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
          {result.message}
        </p>
      )}
      <Button type="submit" loading={loading} className="self-start">
        Send announcement
      </Button>
    </form>
  );
}

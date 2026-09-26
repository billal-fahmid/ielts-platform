"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Flag, Heart, Pin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { send } from "@/lib/teaching/client";
import { cn } from "@/lib/utils";
import { KIND_LABELS, MAX_TAGS, POST_KINDS, REPORT_REASONS, REPORT_REASON_LABELS } from "@/lib/community/rules";

export function NewPostForm({ defaultKind = "DISCUSSION", categories }: { defaultKind?: string; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [kind, setKind] = useState(defaultKind);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await send("/api/community/posts", "POST", { kind, categoryId, title, body, tags: tags.split(/[,\n]/).map((t) => t.trim()).filter(Boolean) });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not post", "error");
    push("Posted", "success");
    router.push(`/dashboard/community/${r.json.post.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="What are you posting?">
        <Select value={kind} onChange={(e) => setKind(e.target.value)}>
          {POST_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
              {k === "QUESTION" ? " (someone can mark the best answer)" : ""}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Category">
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          <option value="">Choose a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Title" hint="A clear title gets better answers.">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={8} maxLength={140} />
      </Field>
      <Field label="Details">
        <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} required maxLength={8000} />
      </Field>
      <Field label="Tags (optional)" hint={`Separate with commas, at most ${MAX_TAGS}. For example: ielts-writing, grammar`}>
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ielts-writing, grammar" />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={busy}>
          Post
        </Button>
      </div>
    </form>
  );
}

export function LikeButton({ targetType, targetId, count, liked, disabled }: { targetType: "POST" | "COMMENT"; targetId: string; count: number; liked: boolean; disabled?: boolean }) {
  const { push } = useToast();
  const [state, setState] = useState({ count, liked });
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    const r = await send("/api/community/like", "POST", { targetType, targetId });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not update your like", "error");
    setState({ count: r.json.count, liked: r.json.liked });
  };
  return (
    <button
      onClick={toggle}
      disabled={busy || disabled}
      aria-pressed={state.liked}
      aria-label={state.liked ? "Remove your like" : "Like"}
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60", state.liked ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft hover:text-ink")}
    >
      <Heart className={cn("h-3.5 w-3.5", state.liked && "fill-current")} /> <span data-testid="like-count">{state.count}</span>
    </button>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await send(`/api/community/posts/${postId}/comments`, "POST", { body });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not post your reply", "error");
    setBody("");
    router.refresh();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a helpful reply" aria-label="Your reply" maxLength={4000} required />
      <div>
        <Button type="submit" loading={busy}>
          Reply
        </Button>
      </div>
    </form>
  );
}

export function ReportButton({ targetType, targetId, reported }: { targetType: "POST" | "COMMENT"; targetId: string; reported: boolean }) {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(reported);
  const [reason, setReason] = useState("SPAM");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const r = await send("/api/community/report", "POST", { targetType, targetId, reason, details: details || null });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not send the report", "error");
    push("Thanks. A moderator will look at it.", "success");
    setDone(true);
    setOpen(false);
  };
  if (done) return <span className="text-xs text-ink-soft">Reported</span>;
  return (
    <span className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-danger">
        <Flag className="h-3.5 w-3.5" /> Report
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 flex w-72 flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-lg" role="dialog" aria-label="Report this">
          <Select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason">
            {REPORT_REASONS.map((r) => (
              <option key={r} value={r}>
                {REPORT_REASON_LABELS[r]}
              </option>
            ))}
          </Select>
          <Textarea rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Anything a moderator should know? (optional)" maxLength={500} aria-label="Details" />
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={submit} loading={busy}>
              Send report
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </span>
  );
}

export function DeleteButton({ kind, id, afterDelete }: { kind: "post" | "comment"; id: string; afterDelete?: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!confirm(kind === "post" ? "Delete this post and all its replies?" : "Delete this reply?")) return;
    setBusy(true);
    const r = await send(kind === "post" ? `/api/community/posts/${id}` : `/api/community/comments/${id}`, "DELETE");
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not delete", "error");
    push("Deleted", "success");
    if (afterDelete) router.push(afterDelete);
    router.refresh();
  };
  return (
    <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-danger disabled:opacity-50">
      <Trash2 className="h-3.5 w-3.5" /> Delete
    </button>
  );
}

/** Marks (or un-marks) a comment as the answer to a question. */
export function AcceptButton({ postId, commentId, accepted }: { postId: string; commentId: string; accepted: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    const r = await send(`/api/community/posts/${postId}/accept`, "POST", { commentId: accepted ? null : commentId });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not update the answer", "error");
    router.refresh();
  };
  return (
    <button onClick={toggle} disabled={busy} className={cn("inline-flex items-center gap-1 text-xs disabled:opacity-50", accepted ? "text-success" : "text-ink-soft hover:text-success")}>
      <CheckCircle2 className="h-3.5 w-3.5" /> {accepted ? "Accepted answer (click to undo)" : "Mark as the answer"}
    </button>
  );
}

export function PinButton({ postId, pinned }: { postId: string; pinned: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    const r = await send("/api/admin/community/pin", "POST", { postId, pinned: !pinned });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not update the pin", "error");
    router.refresh();
  };
  return (
    <button onClick={toggle} disabled={busy} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink disabled:opacity-50">
      <Pin className="h-3.5 w-3.5" /> {pinned ? "Unpin" : "Pin to top"}
    </button>
  );
}

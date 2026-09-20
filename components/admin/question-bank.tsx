"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Inbox, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { QUESTION_TYPES, QUESTION_TYPE_LABELS } from "@/lib/ielts/question-validation";
import { QuestionEditor, type Parents, type StoredQuestion, type buildPayload } from "./question-editor";

type Row = {
  id: string;
  skill: "LISTENING" | "READING";
  questionType: string;
  prompt: string;
  difficulty: string;
  topic: string | null;
  tags: string[];
  points: number;
  order: number;
  published: boolean;
  parentLabel: string;
};

const PAGE_SIZE = 20;

export function QuestionBank() {
  const { push } = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [parents, setParents] = useState<Parents>({ passages: [], sections: [] });
  const [loadError, setLoadError] = useState(false);

  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("");
  const [type, setType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);

  const [editing, setEditing] = useState<StoredQuestion | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  /** The question just created or edited: the list jumps to its page and highlights it. */
  const [focusId, setFocusId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/ielts/questions").catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json) {
      setLoadError(true);
      setRows([]);
      return;
    }
    setLoadError(false);
    setRows(json.items);
    setParents(json.parents);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (!skill || r.skill === skill) &&
        (!type || r.questionType === type) &&
        (!difficulty || r.difficulty === difficulty) &&
        (!status || (status === "published" ? r.published : !r.published)) &&
        (!q || [r.prompt, r.topic ?? "", r.parentLabel, ...r.tags].some((t) => t.toLowerCase().includes(q)))
    );
  }, [rows, search, skill, type, difficulty, status]);

  // Keep the page in range when filters shrink the list.
  useEffect(() => setPage(0), [search, skill, type, difficulty, status]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const publishedCount = (rows ?? []).filter((r) => r.published).length;

  useEffect(() => {
    if (!focusId || !rows) return;
    const index = filtered.findIndex((r) => r.id === focusId);
    if (index < 0 && rows.some((r) => r.id === focusId)) {
      // A filter is hiding it; clear them so the admin can see what they just saved.
      setSearch("");
      setSkill("");
      setType("");
      setDifficulty("");
      setStatus("");
      return;
    }
    if (index >= 0) setPage(Math.floor(index / PAGE_SIZE));
    const scroll = setTimeout(() => document.getElementById(`q-${focusId}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
    const clear = setTimeout(() => setFocusId(null), 2500);
    return () => {
      clearTimeout(scroll);
      clearTimeout(clear);
    };
  }, [focusId, rows, filtered]);

  const openCreate = () => {
    setEditing(null);
    setServerErrors([]);
    setShowEditor(true);
  };

  const openEdit = async (row: Row) => {
    setBusyId(row.id);
    const res = await fetch(`/api/admin/ielts/questions/${row.id}`).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusyId(null);
    if (!res?.ok || !json?.question) {
      push("Couldn't open that question", "error");
      return;
    }
    setEditing(json.question);
    setServerErrors([]);
    setShowEditor(true);
  };

  const save = async (payload: ReturnType<typeof buildPayload>) => {
    setSaving(true);
    setServerErrors([]);
    const res = await fetch(editing ? `/api/admin/ielts/questions/${editing.id}` : "/api/admin/ielts/questions", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setServerErrors(json?.errors ?? [json?.error ?? "Couldn't save. Check your connection and try again."]);
      return;
    }
    push(editing ? "Question updated" : "Question created", "success");
    setShowEditor(false);
    setFocusId(json?.id ?? editing?.id ?? null);
    load();
  };

  const togglePublished = async (row: Row) => {
    setBusyId(row.id);
    const res = await fetch(`/api/admin/ielts/questions/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !row.published }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusyId(null);
    if (!res?.ok) {
      push(json?.errors?.join(" ") ?? json?.error ?? "Couldn't change the status", "error");
      return;
    }
    push(row.published ? "Question unpublished" : "Question published", "success");
    load();
  };

  const remove = async (row: Row) => {
    if (!confirm("Delete this question? This can't be undone.")) return;
    setBusyId(row.id);
    const res = await fetch(`/api/admin/ielts/questions/${row.id}`, { method: "DELETE" }).catch(() => null);
    setBusyId(null);
    if (!res?.ok) {
      push("Couldn't delete the question", "error");
      return;
    }
    push("Question deleted", "success");
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">IELTS Questions</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {rows ? `${rows.length} questions · ${publishedCount} published` : "Loading…"}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New question
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1.4fr_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search question, topic, tag…" aria-label="Search questions" className="pl-9" />
        </div>
        <Select value={skill} onChange={(e) => setSkill(e.target.value)} aria-label="Filter by skill">
          <option value="">All skills</option>
          <option value="READING">Reading</option>
          <option value="LISTENING">Listening</option>
        </Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by question type">
          <option value="">All types</option>
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Filter by difficulty">
          <option value="">Any difficulty</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">Any status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
      </div>

      <Card className="mt-4 overflow-x-auto p-0">
        {rows === null ? (
          <div className="p-5">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="mt-2 h-8 w-full" />
            <Skeleton className="mt-2 h-8 w-full" />
          </div>
        ) : loadError ? (
          <EmptyState icon={Inbox} title="Couldn't load the question bank" description="Check your connection and try again." action={<Button onClick={load}>Retry</Button>} />
        ) : filtered.length === 0 ? (
          rows.length === 0 ? (
            <EmptyState icon={Inbox} title="No questions yet" description="Create a passage or listening section first, then add its questions here." action={<Button onClick={openCreate}>New question</Button>} />
          ) : (
            <EmptyState icon={Search} title="No questions match" description="Try clearing a filter or changing the search." />
          )
        ) : (
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Question</th>
                <th className="px-4 py-3 font-medium">Section</th>
                <th className="px-4 py-3 font-medium">Difficulty</th>
                <th className="px-4 py-3 font-medium">Topic &amp; tags</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.id}
                  id={`q-${r.id}`}
                  className={cn(
                    "border-b border-border align-top transition-colors last:border-0 hover:bg-primary-soft/40",
                    r.id === focusId && "bg-primary-soft"
                  )}
                >
                  <td className="max-w-xs px-4 py-3">
                    <p className="line-clamp-2 text-ink">{r.prompt}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {r.skill === "READING" ? "Reading" : "Listening"} · {QUESTION_TYPE_LABELS[r.questionType as keyof typeof QUESTION_TYPE_LABELS] ?? r.questionType}
                    </p>
                  </td>
                  <td className="max-w-[14rem] px-4 py-3 text-ink-soft">{r.parentLabel}</td>
                  <td className="px-4 py-3">
                    <Badge tone={r.difficulty === "HARD" ? "danger" : r.difficulty === "EASY" ? "success" : "neutral"}>
                      {r.difficulty.charAt(0) + r.difficulty.slice(1).toLowerCase()}
                    </Badge>
                  </td>
                  <td className="max-w-[12rem] px-4 py-3">
                    <p className="text-ink">{r.topic ?? "—"}</p>
                    {r.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.tags.map((t) => (
                          <Badge key={t} tone="neutral">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={r.published ? "success" : "neutral"}>{r.published ? "Published" : "Draft"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => togglePublished(r)}
                        disabled={busyId === r.id}
                        aria-label={r.published ? "Unpublish question" : "Publish question"}
                        title={r.published ? "Unpublish" : "Publish"}
                        className="rounded-md p-1.5 text-ink-soft hover:bg-primary-soft hover:text-primary disabled:opacity-50"
                      >
                        {r.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        disabled={busyId === r.id}
                        aria-label="Edit question"
                        title="Edit"
                        className="rounded-md p-1.5 text-ink-soft hover:bg-primary-soft hover:text-primary disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(r)}
                        disabled={busyId === r.id}
                        aria-label="Delete question"
                        title="Delete"
                        className="rounded-md p-1.5 text-ink-soft hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between text-sm text-ink-soft">
          <span>
            Page {page + 1} of {pageCount} · {filtered.length} questions
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              Previous
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1}>
              Next
            </Button>
          </div>
        </div>
      )}

      {showEditor && (
        <QuestionEditor
          key={editing?.id ?? "new"}
          initial={editing}
          parents={parents}
          saving={saving}
          serverErrors={serverErrors}
          onCancel={() => setShowEditor(false)}
          onSave={save}
        />
      )}
    </div>
  );
}

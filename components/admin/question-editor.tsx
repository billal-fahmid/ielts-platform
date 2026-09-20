"use client";

import { useMemo, useState } from "react";
import { X, Plus, Trash2, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { QuestionRenderer } from "@/components/ielts/question-renderer";
import { DIFFICULTIES, QUESTION_TYPES, QUESTION_TYPE_LABELS, validateQuestion, type QuestionType } from "@/lib/ielts/question-validation";
import { TRUE_FALSE_OPTIONS, YES_NO_OPTIONS } from "@/lib/ielts/question-types";

export type StoredQuestion = {
  id: string;
  skill: "LISTENING" | "READING";
  passageId: string | null;
  listeningSectionId: string | null;
  questionType: QuestionType;
  prompt: string;
  difficulty: string;
  topic: string | null;
  tags: string[] | null;
  points: number;
  order: number;
  explanation: string | null;
  published: boolean;
  content: Record<string, any>;
  correctAnswer: any;
};

export type Parents = { passages: { id: string; label: string }[]; sections: { id: string; label: string }[] };

/** Editor state. Answers are tracked by position so renaming an option never breaks which one is correct. */
type Form = {
  skill: "READING" | "LISTENING";
  parentId: string;
  questionType: QuestionType;
  prompt: string;
  difficulty: string;
  topic: string;
  tags: string;
  points: string;
  order: string;
  explanation: string;
  published: boolean;
  options: string[];
  correctIndex: number | null;
  correctIndices: number[];
  items: string[];
  matchIndex: (number | null)[];
  choice: string;
  wordLimit: string;
  answers: string[];
  imageUrl: string;
  labels: string[];
  correctLabel: number | null;
};

const blank = (n: number) => Array.from({ length: n }, () => "");

const emptyForm = (): Form => ({
  skill: "READING",
  parentId: "",
  questionType: "MCQ_SINGLE",
  prompt: "",
  difficulty: "MEDIUM",
  topic: "",
  tags: "",
  points: "1",
  order: "0",
  explanation: "",
  published: false,
  options: blank(4),
  correctIndex: null,
  correctIndices: [],
  items: blank(3),
  matchIndex: [null, null, null],
  choice: "",
  wordLimit: "2",
  answers: [""],
  imageUrl: "",
  labels: ["A", "B", "C", "D", "E", "F"],
  correctLabel: null,
});

function formFromQuestion(q: StoredQuestion): Form {
  const f = emptyForm();
  const content = q.content ?? {};
  const correct = q.correctAnswer;
  Object.assign(f, {
    skill: q.skill,
    parentId: (q.skill === "READING" ? q.passageId : q.listeningSectionId) ?? "",
    questionType: q.questionType,
    prompt: q.prompt,
    difficulty: q.difficulty,
    topic: q.topic ?? "",
    tags: (q.tags ?? []).join(", "),
    points: String(q.points),
    order: String(q.order),
    explanation: q.explanation ?? "",
    published: q.published,
  });

  switch (q.questionType) {
    case "MCQ_SINGLE": {
      f.options = Array.isArray(content.options) ? [...content.options] : blank(4);
      const i = f.options.indexOf(correct);
      f.correctIndex = i >= 0 ? i : null;
      break;
    }
    case "MCQ_MULTI": {
      f.options = Array.isArray(content.options) ? [...content.options] : blank(5);
      f.correctIndices = (Array.isArray(correct) ? correct : []).map((c: string) => f.options.indexOf(c)).filter((i: number) => i >= 0);
      break;
    }
    case "MATCHING": {
      f.items = Array.isArray(content.items) ? [...content.items] : blank(3);
      f.options = Array.isArray(content.options) ? [...content.options] : blank(4);
      const map = correct && typeof correct === "object" ? correct : {};
      f.matchIndex = f.items.map((item) => {
        const i = f.options.indexOf(map[item]);
        return i >= 0 ? i : null;
      });
      break;
    }
    case "TRUE_FALSE_NOT_GIVEN":
    case "YES_NO_NOT_GIVEN":
      f.choice = typeof correct === "string" ? correct : "";
      break;
    case "MAP_LABELING": {
      f.imageUrl = content.imageUrl ?? "";
      f.labels = Array.isArray(content.labels) ? [...content.labels] : emptyForm().labels;
      const i = f.labels.indexOf(correct);
      f.correctLabel = i >= 0 ? i : null;
      break;
    }
    default:
      f.wordLimit = String(content.wordLimit ?? 2);
      f.answers = Array.isArray(correct) ? [...correct] : [String(correct ?? "")];
  }
  return f;
}

/** The request body for the API, built from the form. The server re-validates everything. */
export function buildPayload(f: Form) {
  const base = {
    skill: f.skill,
    passageId: f.skill === "READING" ? f.parentId : null,
    listeningSectionId: f.skill === "LISTENING" ? f.parentId : null,
    questionType: f.questionType,
    prompt: f.prompt,
    difficulty: f.difficulty,
    topic: f.topic,
    tags: f.tags,
    points: f.points,
    order: f.order,
    explanation: f.explanation,
    published: f.published,
  };
  switch (f.questionType) {
    case "MCQ_SINGLE":
      return { ...base, content: { options: f.options }, correctAnswer: f.correctIndex === null ? "" : f.options[f.correctIndex] ?? "" };
    case "MCQ_MULTI":
      return { ...base, content: { options: f.options }, correctAnswer: f.correctIndices.map((i) => f.options[i]).filter(Boolean) };
    case "MATCHING":
      return {
        ...base,
        content: { items: f.items, options: f.options },
        correctAnswer: Object.fromEntries(f.items.map((item, i) => [item.trim(), f.matchIndex[i] == null ? "" : f.options[f.matchIndex[i]!] ?? ""])),
      };
    case "TRUE_FALSE_NOT_GIVEN":
    case "YES_NO_NOT_GIVEN":
      return { ...base, content: {}, correctAnswer: f.choice };
    case "MAP_LABELING":
      return { ...base, content: { imageUrl: f.imageUrl, labels: f.labels }, correctAnswer: f.correctLabel === null ? "" : f.labels[f.correctLabel] ?? "" };
    default:
      return { ...base, content: { wordLimit: f.wordLimit }, correctAnswer: f.answers };
  }
}

/** Editable list of text rows (options, items, labels, accepted answers). */
function StringList({
  values,
  onChange,
  placeholder,
  min,
  addLabel,
  render,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  min: number;
  addLabel: string;
  /** Optional control shown before each row, e.g. a radio for the correct option. */
  render?: (index: number) => React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          {render?.(i)}
          <Input value={v} placeholder={`${placeholder} ${i + 1}`} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            disabled={values.length <= min}
            aria-label={`Remove ${placeholder.toLowerCase()} ${i + 1}`}
            className="rounded-md p-2 text-ink-soft hover:bg-danger-soft hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-soft"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...values, ""])} className="flex items-center gap-1.5 self-start text-sm font-medium text-primary hover:underline">
        <Plus className="h-4 w-4" /> {addLabel}
      </button>
    </div>
  );
}

export function QuestionEditor({
  initial,
  parents,
  saving,
  serverErrors,
  onCancel,
  onSave,
}: {
  initial: StoredQuestion | null;
  parents: Parents;
  saving: boolean;
  serverErrors: string[];
  onCancel: () => void;
  onSave: (payload: ReturnType<typeof buildPayload>) => void;
}) {
  const [f, setF] = useState<Form>(() => (initial ? formFromQuestion(initial) : emptyForm()));
  const [showPreview, setShowPreview] = useState(false);
  const [previewValue, setPreviewValue] = useState<unknown>(undefined);
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setF((s) => ({ ...s, [key]: value }));

  const payload = useMemo(() => buildPayload(f), [f]);
  const validation = useMemo(() => validateQuestion(payload), [payload]);
  const errors = validation.ok ? [] : validation.errors;
  const parentOptions = f.skill === "READING" ? parents.passages : parents.sections;

  const changeType = (type: QuestionType) => {
    setF((s) => {
      const d = emptyForm();
      const multi = type === "MCQ_MULTI";
      const keepsOptions = (s.questionType === "MCQ_SINGLE" || s.questionType === "MCQ_MULTI") && (type === "MCQ_SINGLE" || multi);
      return {
        ...s,
        questionType: type,
        options: keepsOptions ? s.options : type === "MATCHING" ? blank(4) : multi ? blank(5) : blank(4),
        correctIndex: null,
        correctIndices: [],
        items: d.items,
        matchIndex: d.matchIndex,
        choice: "",
        answers: [""],
        correctLabel: null,
      };
    });
    setPreviewValue(undefined);
  };

  const toggleMulti = (i: number) =>
    set("correctIndices", f.correctIndices.includes(i) ? f.correctIndices.filter((x) => x !== i) : [...f.correctIndices, i]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validation.ok) onSave(payload);
  };

  const radioBtn = (checked: boolean, onClick: () => void, label: string, square = false) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={checked}
      title={label}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center border",
        square ? "rounded" : "rounded-full",
        checked ? "border-success bg-success text-white" : "border-border text-transparent hover:border-success"
      )}
    >
      <span className="text-[11px] leading-none">✓</span>
    </button>
  );

  const previewQuestion =
    validation.ok && showPreview
      ? { id: "preview", questionType: validation.value.questionType, prompt: validation.value.prompt, content: validation.value.content, order: 0, points: validation.value.points }
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={initial ? "Edit question" : "New question"}>
      <form onSubmit={submit} className="flex max-h-full w-full max-w-3xl flex-col rounded-2xl border border-border bg-surface">
        <div className="flex shrink-0 items-center justify-between rounded-t-2xl border-b border-border px-5 py-4">
          <h2 className="font-display text-lg text-ink">{initial ? "Edit question" : "New question"}</h2>
          <button type="button" onClick={onCancel} aria-label="Close" className="text-ink-soft hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Skill">
              <Select
                value={f.skill}
                onChange={(e) => {
                  set("skill", e.target.value as Form["skill"]);
                  set("parentId", "");
                }}
              >
                <option value="READING">Reading</option>
                <option value="LISTENING">Listening</option>
              </Select>
            </Field>
            <Field
              label={f.skill === "READING" ? "Passage (section)" : "Listening section"}
              hint={parentOptions.length === 0 ? `No ${f.skill === "READING" ? "passages" : "sections"} yet — create one first.` : undefined}
            >
              <Select value={f.parentId} onChange={(e) => set("parentId", e.target.value)}>
                <option value="">Select…</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
          </section>

          <section className="flex flex-col gap-4">
            <Field label="Question type">
              <Select value={f.questionType} onChange={(e) => changeType(e.target.value as QuestionType)}>
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {QUESTION_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Question / instruction"
              hint={
                ["FORM_COMPLETION", "SENTENCE_COMPLETION", "SUMMARY_COMPLETION"].includes(f.questionType)
                  ? "Show the gap with a run of underscores, e.g. “The tour starts at ______ o'clock.”"
                  : undefined
              }
            >
              <Textarea rows={2} value={f.prompt} onChange={(e) => set("prompt", e.target.value)} />
            </Field>
          </section>

          <section className="rounded-xl border border-border bg-bg p-4">
            <h3 className="mb-3 text-sm font-medium text-ink">Answer</h3>

            {f.questionType === "MCQ_SINGLE" && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-ink-soft">Tick the one correct option.</p>
                <StringList
                  values={f.options}
                  onChange={(v) => setF((s) => ({ ...s, options: v, correctIndex: s.correctIndex !== null && s.correctIndex >= v.length ? null : s.correctIndex }))}
                  placeholder="Option"
                  min={2}
                  addLabel="Add option"
                  render={(i) => radioBtn(f.correctIndex === i, () => set("correctIndex", i), `Mark option ${i + 1} as correct`)}
                />
              </div>
            )}

            {f.questionType === "MCQ_MULTI" && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-ink-soft">Tick every correct option. Students will be told how many to choose.</p>
                <StringList
                  values={f.options}
                  onChange={(v) => setF((s) => ({ ...s, options: v, correctIndices: s.correctIndices.filter((i) => i < v.length) }))}
                  placeholder="Option"
                  min={3}
                  addLabel="Add option"
                  render={(i) => radioBtn(f.correctIndices.includes(i), () => toggleMulti(i), `Mark option ${i + 1} as correct`, true)}
                />
              </div>
            )}

            {f.questionType === "MATCHING" && (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="mb-2 text-xs text-ink-soft">Options students choose from (you can add extras that match nothing).</p>
                  <StringList
                    values={f.options}
                    onChange={(v) => setF((s) => ({ ...s, options: v, matchIndex: s.matchIndex.map((m) => (m !== null && m >= v.length ? null : m)) }))}
                    placeholder="Option"
                    min={2}
                    addLabel="Add option"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs text-ink-soft">Items to match, and the correct option for each.</p>
                  <div className="flex flex-col gap-2">
                    {f.items.map((item, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <Input
                          className="min-w-40 flex-1"
                          value={item}
                          placeholder={`Item ${i + 1}`}
                          onChange={(e) => set("items", f.items.map((x, j) => (j === i ? e.target.value : x)))}
                        />
                        <Select
                          className="min-w-40 flex-1"
                          aria-label={`Correct match for item ${i + 1}`}
                          value={f.matchIndex[i] ?? ""}
                          onChange={(e) => set("matchIndex", f.matchIndex.map((m, j) => (j === i ? (e.target.value === "" ? null : Number(e.target.value)) : m)))}
                        >
                          <option value="">Correct option…</option>
                          {f.options.map((o, j) => (
                            <option key={j} value={j} disabled={!o.trim()}>
                              {o.trim() || `(option ${j + 1} is empty)`}
                            </option>
                          ))}
                        </Select>
                        <button
                          type="button"
                          onClick={() => setF((s) => ({ ...s, items: s.items.filter((_, j) => j !== i), matchIndex: s.matchIndex.filter((_, j) => j !== i) }))}
                          disabled={f.items.length <= 2}
                          aria-label={`Remove item ${i + 1}`}
                          className="rounded-md p-2 text-ink-soft hover:bg-danger-soft hover:text-danger disabled:opacity-30"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setF((s) => ({ ...s, items: [...s.items, ""], matchIndex: [...s.matchIndex, null] }))}
                      className="flex items-center gap-1.5 self-start text-sm font-medium text-primary hover:underline"
                    >
                      <Plus className="h-4 w-4" /> Add item
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(f.questionType === "TRUE_FALSE_NOT_GIVEN" || f.questionType === "YES_NO_NOT_GIVEN") && (
              <Field label="Correct answer">
                <Select value={f.choice} onChange={(e) => set("choice", e.target.value)}>
                  <option value="">Select…</option>
                  {(f.questionType === "TRUE_FALSE_NOT_GIVEN" ? TRUE_FALSE_OPTIONS : YES_NO_OPTIONS).map((o) => (
                    <option key={o} value={o}>
                      {o.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {["FORM_COMPLETION", "SENTENCE_COMPLETION", "SUMMARY_COMPLETION", "SHORT_ANSWER"].includes(f.questionType) && (
              <div className="flex flex-col gap-4">
                <Field label="Word limit" hint="Students are told “no more than N words”. Accepted answers can't be longer.">
                  <Input type="number" min={1} max={10} value={f.wordLimit} onChange={(e) => set("wordLimit", e.target.value)} className="max-w-28" />
                </Field>
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">Accepted answers</p>
                  <p className="mb-2 text-xs text-ink-soft">Not case-sensitive. Add alternative spellings or numbers, e.g. “22” and “twenty-two”.</p>
                  <StringList values={f.answers} onChange={(v) => set("answers", v)} placeholder="Answer" min={1} addLabel="Add accepted answer" />
                </div>
              </div>
            )}

            {f.questionType === "MAP_LABELING" && (
              <div className="flex flex-col gap-4">
                <Field label="Map or diagram image" hint="A path such as /listening/campus-map.svg, or a full https:// link.">
                  <Input value={f.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} />
                </Field>
                <div>
                  <p className="mb-2 text-sm font-medium text-ink">Labels on the image</p>
                  <p className="mb-2 text-xs text-ink-soft">Tick the label that is correct for this question.</p>
                  <StringList
                    values={f.labels}
                    onChange={(v) => setF((s) => ({ ...s, labels: v, correctLabel: s.correctLabel !== null && s.correctLabel >= v.length ? null : s.correctLabel }))}
                    placeholder="Label"
                    min={2}
                    addLabel="Add label"
                    render={(i) => radioBtn(f.correctLabel === i, () => set("correctLabel", i), `Mark label ${i + 1} as correct`)}
                  />
                </div>
              </div>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <Field label="Difficulty">
              <Select value={f.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0) + d.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Topic">
              <Input value={f.topic} onChange={(e) => set("topic", e.target.value)} placeholder="e.g. Environment" />
            </Field>
            <Field label="Tags" hint="Separate with commas.">
              <Input value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="e.g. vocabulary, paragraph 2" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Points">
                <Input type="number" min={1} max={10} value={f.points} onChange={(e) => set("points", e.target.value)} />
              </Field>
              <Field label="Order">
                <Input type="number" min={0} max={999} value={f.order} onChange={(e) => set("order", e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Explanation (shown to students after they submit)">
                <Textarea rows={3} value={f.explanation} onChange={(e) => set("explanation", e.target.value)} />
              </Field>
            </div>
            <label className="flex items-start gap-2.5 sm:col-span-2">
              <input type="checkbox" checked={f.published} onChange={(e) => set("published", e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
              <span className="text-sm text-ink">
                Published
                <span className="block text-xs text-ink-soft">Students only see published questions, and only inside a published passage or test.</span>
              </span>
            </label>
          </section>

          <section>
            <button type="button" onClick={() => setShowPreview((s) => !s)} className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              <Eye className="h-4 w-4" /> {showPreview ? "Hide" : "Show"} student preview
            </button>
            {showPreview &&
              (previewQuestion ? (
                <div className="mt-3 rounded-xl border border-border bg-bg p-4">
                  <p className="text-sm font-medium text-ink">1. {previewQuestion.prompt}</p>
                  <div className="mt-3">
                    <QuestionRenderer question={previewQuestion} value={previewValue} onChange={setPreviewValue} />
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-soft">Finish the question to see how students will see it.</p>
              ))}
          </section>
        </div>

        {(errors.length > 0 || serverErrors.length > 0) && (
          <div role="alert" className="max-h-32 shrink-0 overflow-y-auto border-t border-border bg-danger-soft px-5 py-3 text-sm text-danger">
            <p className="flex items-center gap-1.5 font-medium">
              <AlertCircle className="h-4 w-4" /> {serverErrors.length > 0 ? "Couldn't save" : "To save this question:"}
            </p>
            <ul className="mt-1 list-disc pl-5">
              {(serverErrors.length > 0 ? serverErrors : errors).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex shrink-0 justify-end gap-2.5 rounded-b-2xl border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!validation.ok}>
            {initial ? "Save changes" : "Create question"}
          </Button>
        </div>
      </form>
    </div>
  );
}

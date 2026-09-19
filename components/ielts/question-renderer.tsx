"use client";

import { cn } from "@/lib/utils";
import { TRUE_FALSE_OPTIONS, YES_NO_OPTIONS } from "@/lib/ielts/question-types";

export type RunnerQuestion = {
  id: string;
  questionType: string;
  prompt: string;
  content: Record<string, unknown>;
  order: number;
  points: number;
};

export function QuestionRenderer({
  question,
  value,
  onChange,
}: {
  question: RunnerQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (question.questionType) {
    case "MCQ_SINGLE":
      return <ChoiceInput options={(question.content.options as string[]) ?? []} value={value as string} onChange={onChange} />;

    case "MCQ_MULTI": {
      const options = (question.content.options as string[]) ?? [];
      const selectCount = (question.content.selectCount as number) ?? 2;
      const selected = (value as string[]) ?? [];
      return (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-ink-soft">Choose {selectCount} answers</p>
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  if (checked) onChange(selected.filter((s) => s !== opt));
                  else if (selected.length < selectCount) onChange([...selected, opt]);
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors",
                  checked ? "border-primary bg-primary-soft text-ink" : "border-border text-ink hover:border-primary/50"
                )}
              >
                <span
                  className={cn(
                    "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border",
                    checked ? "border-primary bg-primary" : "border-border"
                  )}
                >
                  {checked && <span className="h-2 w-2 rounded-sm bg-white" />}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      );
    }

    case "MATCHING": {
      const items = (question.content.items as string[]) ?? [];
      const options = (question.content.options as string[]) ?? [];
      const answer = (value as Record<string, string>) ?? {};
      return (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-sm text-ink">{item}</span>
              <select
                value={answer[item] || ""}
                onChange={(e) => onChange({ ...answer, [item]: e.target.value })}
                className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="">Select...</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }

    case "TRUE_FALSE_NOT_GIVEN":
      return <ChoiceInput options={TRUE_FALSE_OPTIONS} value={value as string} onChange={onChange} />;

    case "YES_NO_NOT_GIVEN":
      return <ChoiceInput options={YES_NO_OPTIONS} value={value as string} onChange={onChange} />;

    case "FORM_COMPLETION":
    case "SENTENCE_COMPLETION":
    case "SUMMARY_COMPLETION":
    case "SHORT_ANSWER": {
      const wordLimit = question.content.wordLimit as number | undefined;
      return (
        <div>
          <input
            type="text"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer"
            className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
          />
          {wordLimit && <p className="mt-1 text-xs text-ink-soft">No more than {wordLimit} word{wordLimit > 1 ? "s" : ""}</p>}
        </div>
      );
    }

    case "MAP_LABELING": {
      const labels = (question.content.labels as string[]) ?? [];
      const imageUrl = question.content.imageUrl as string | undefined;
      return (
        <div className="flex flex-col gap-3">
          {imageUrl && <img src={imageUrl} alt="Map" className="rounded-lg border border-border" />}
          <ChoiceInput options={labels} value={value as string} onChange={onChange} />
        </div>
      );
    }

    default:
      return (
        <input
          type="text"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer"
          className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 text-sm outline-none focus:border-primary"
        />
      );
  }
}

function ChoiceInput({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors",
            value === opt ? "border-primary bg-primary-soft text-ink" : "border-border text-ink hover:border-primary/50"
          )}
        >
          <span
            className={cn(
              "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border",
              value === opt ? "border-primary bg-primary" : "border-border"
            )}
          >
            {value === opt && <span className="h-2 w-2 rounded-full bg-white" />}
          </span>
          {opt}
        </button>
      ))}
    </div>
  );
}

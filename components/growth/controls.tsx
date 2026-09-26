"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { send } from "@/lib/teaching/client";
import { cn } from "@/lib/utils";
import { VISIBILITY_LABELS, type Visibility } from "@/lib/growth/rules";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const { push } = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      push("Couldn't copy. Select the text and copy it yourself.", "error");
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : label}
    </Button>
  );
}

export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Print or save as PDF
    </Button>
  );
}

/** The student's choice of how they appear on leaderboards. Saves as soon as it changes. */
export function PrivacyChoice({ current }: { current: Visibility }) {
  const router = useRouter();
  const { push } = useToast();
  const [value, setValue] = useState<Visibility>(current);
  const [busy, setBusy] = useState(false);
  const choose = async (next: Visibility) => {
    if (next === value) return;
    const previous = value;
    setValue(next);
    setBusy(true);
    const r = await send("/api/growth/leaderboard-privacy", "POST", { visibility: next });
    setBusy(false);
    if (!r.ok) {
      setValue(previous);
      return push(r.json.error || "Could not save your choice", "error");
    }
    push("Saved", "success");
    router.refresh();
  };
  return (
    <fieldset disabled={busy} className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-ink">How do you appear on leaderboards?</legend>
      {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((v) => (
        <label key={v} className={cn("flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm", value === v ? "border-primary bg-primary-soft/50" : "border-border")}>
          <input type="radio" name="leaderboard-visibility" value={v} checked={value === v} onChange={() => choose(v)} className="mt-0.5 h-4 w-4 accent-primary" />
          <span>
            <span className="font-medium text-ink">{VISIBILITY_LABELS[v].title}</span>
            <span className="block text-xs text-ink-soft">{VISIBILITY_LABELS[v].hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

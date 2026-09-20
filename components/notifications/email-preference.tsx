"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

/** Opt in or out of email copies of important notifications. In-app notifications are always on. */
export function EmailPreference({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    setError(null);
    const res = await fetch("/api/notifications/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailNotifications: next }) }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      setEnabled(!next);
      setError("We could not save that. Please try again.");
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">Email notifications</p>
        <p className="text-xs text-ink-soft">Get an email for important things like course completion, teacher feedback and payments.</p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Email notifications"
        onClick={toggle}
        disabled={saving}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-border"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled ? "left-[1.375rem]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

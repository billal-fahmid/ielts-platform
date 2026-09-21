"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked: the number is still shown on screen */
        }
      }}
      aria-label={`Copy ${label}`}
      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink hover:bg-primary-soft"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function ManualPaymentForm({ transactionId, methodLabel, needsSender, hint }: { transactionId: string; methodLabel: string; needsSender: boolean; hint: string }) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [sender, setSender] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/payments/${transactionId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, senderNumber: needsSender ? sender : undefined }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else setError(data?.error ?? "We couldn't save that. Please try again.");
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label={`${methodLabel} transaction ID`} hint={hint}>
        <Input value={reference} onChange={(e) => setReference(e.target.value)} required maxLength={60} autoComplete="off" spellCheck={false} placeholder="e.g. 8N7A5B3C2D" />
      </Field>
      {needsSender && (
        <Field label={`The ${methodLabel} number you paid from`} hint="For example 01712345678">
          <Input value={sender} onChange={(e) => setSender(e.target.value)} required inputMode="tel" maxLength={20} autoComplete="tel" placeholder="01XXXXXXXXX" />
        </Field>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" loading={busy} className="self-start">
        I&apos;ve paid — send for checking
      </Button>
    </form>
  );
}

export function CancelPaymentButton({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setBusy(true);
    const res = await fetch(`/api/payments/${transactionId}/cancel`, { method: "POST" }).catch(() => null);
    setBusy(false);
    if (res?.ok) router.refresh();
    else setError("Couldn't cancel. Please try again.");
  };

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-sm text-ink-soft underline hover:text-ink">
        Cancel this payment
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label="Cancel this payment?" className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
      Cancel this payment? If you already sent money, don&apos;t cancel: report the transaction ID above instead.
      <Button size="sm" variant="danger" onClick={cancel} loading={busy}>
        Yes, cancel it
      </Button>
      <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>
        Keep it
      </Button>
      {error && (
        <span role="alert" className="text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer className="h-4 w-4" /> Print receipt
    </Button>
  );
}

export function RefreshStatusButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      loading={busy}
      onClick={() => {
        setBusy(true);
        router.refresh();
        setTimeout(() => setBusy(false), 800);
      }}
    >
      <RefreshCw className="h-4 w-4" /> Check again
    </Button>
  );
}

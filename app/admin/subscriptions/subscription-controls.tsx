"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";

export function GrantForm({ plans }: { plans: { code: string; name: string }[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [planCode, setPlanCode] = useState(plans[0]?.code ?? "");
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/admin/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, planCode, days: Number(days) }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setLoading(false);
    if (res?.ok) {
      setResult({ ok: true, message: `Done. Access runs until ${new Date(data.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.` });
      setEmail("");
      router.refresh();
    } else {
      setResult({ ok: false, message: data?.error ?? "Could not grant the plan." });
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1.6fr_1fr_0.8fr_auto] sm:items-end">
      <Field label="Student email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="student@example.com" />
      </Field>
      <Field label="Plan">
        <Select value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Days">
        <Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} required />
      </Field>
      <Button type="submit" loading={loading}>
        Give plan
      </Button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={`text-sm sm:col-span-4 ${result.ok ? "text-success" : "text-danger"}`}>
          {result.message}
        </p>
      )}
    </form>
  );
}

export function SubscriptionActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = async (body: unknown) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/subscriptions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setConfirmRevoke(false);
      router.refresh();
    } else setError("Couldn't update. Try again.");
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" onClick={() => act({ action: "extend", days: 30 })} disabled={busy}>
          +30 days
        </Button>
        {confirmRevoke ? (
          <Button size="sm" variant="danger" onClick={() => act({ action: "revoke" })} loading={busy}>
            Confirm end now
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirmRevoke(true)} disabled={busy}>
            End now
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

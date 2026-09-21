"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Action = "approve" | "reject" | "refund";

export function PaymentActions({ id, status, amount }: { id: string; status: string; amount: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canApprove = status === "PROCESSING";
  const canReject = status === "PENDING" || status === "PROCESSING";
  const canRefund = status === "COMPLETED";
  if (!canApprove && !canReject && !canRefund) return null;

  const run = async (action: Action) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/payments/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "approve" ? { action } : { action, reason }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setPending(null);
      setReason("");
      router.refresh();
    } else setError(data?.error ?? "Couldn't update. Try again.");
  };

  if (pending) {
    const needsReason = pending !== "approve";
    return (
      <div role="group" aria-label={`Confirm ${pending}`} className="flex w-56 flex-col gap-2">
        <p className="text-xs text-ink">
          {pending === "approve" && `Confirm you received ${amount}. The student's plan starts now.`}
          {pending === "reject" && "Tell the student why. They will see this."}
          {pending === "refund" && `Mark ${amount} as refunded. This ends the plan. Send the money back yourself.`}
        </p>
        {needsReason && <input value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason" placeholder="Reason" maxLength={300} className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-xs text-ink" />}
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-1.5">
          <Button size="sm" variant={pending === "approve" ? "primary" : "danger"} onClick={() => run(pending)} loading={busy}>
            Confirm {pending}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setPending(null); setError(null); }} disabled={busy}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {canApprove && (
        <Button size="sm" onClick={() => setPending("approve")}>
          Approve
        </Button>
      )}
      {canReject && (
        <Button size="sm" variant="outline" onClick={() => setPending("reject")}>
          Reject
        </Button>
      )}
      {canRefund && (
        <Button size="sm" variant="outline" onClick={() => setPending("refund")}>
          Refund
        </Button>
      )}
    </div>
  );
}

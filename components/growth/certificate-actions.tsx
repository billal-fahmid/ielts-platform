"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { send } from "@/lib/teaching/client";

/** An administrator's revoke / restore button for one certificate. */
export function RevokeButton({ id, revoked, code }: { id: string; revoked: boolean; code: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    let reason: string | null = null;
    if (!revoked) {
      reason = window.prompt(`Revoke ${code}? Its public page will say it is no longer valid. Reason (optional, private):`, "");
      if (reason === null) return;
    }
    setBusy(true);
    const r = await send(`/api/admin/certificates/${id}`, "PATCH", { revoked: !revoked, reason: reason || null });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not update the certificate", "error");
    push(revoked ? "Restored" : "Revoked", "success");
    router.refresh();
  };
  return (
    <Button size="sm" variant={revoked ? "outline" : "ghost"} loading={busy} onClick={toggle}>
      {revoked ? "Restore" : "Revoke"}
    </Button>
  );
}

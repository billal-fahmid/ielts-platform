"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { send } from "@/lib/teaching/client";

type Action = "HIDE" | "RESTORE" | "DISMISS" | "DELETE";

/** A moderator's buttons for one piece of reported or hidden content. */
export function ModerationActions({ targetType, targetId, hidden, reported = false, actions }: { targetType: "POST" | "COMMENT"; targetId: string; hidden: boolean; /** True when people have reported it: restoring then also closes those reports. */ reported?: boolean; actions?: Action[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState<Action | null>(null);

  const run = async (action: Action) => {
    if (action === "DELETE" && !confirm("Delete this for good? Its replies go with it.")) return;
    setBusy(action);
    const r = await send("/api/admin/community/resolve", "POST", { targetType, targetId, action });
    setBusy(null);
    if (!r.ok) return push(r.json.error || "Could not do that", "error");
    push(action === "HIDE" ? "Hidden" : action === "DELETE" ? "Deleted" : action === "RESTORE" ? "Restored" : "Reports dismissed", "success");
    router.refresh();
  };

  const list: Action[] = actions ?? (hidden ? ["RESTORE", "DELETE"] : ["DISMISS", "HIDE", "DELETE"]);
  const label: Record<Action, string> = { HIDE: "Hide", RESTORE: reported ? "Restore (reports were wrong)" : "Restore", DISMISS: "Dismiss reports", DELETE: "Delete" };
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((a) => (
        <Button key={a} size="sm" variant={a === "DELETE" ? "danger" : "outline"} loading={busy === a} onClick={() => run(a)}>
          {label[a]}
        </Button>
      ))}
    </div>
  );
}

export function BanButton({ userId, name, banned }: { userId: string; name: string; banned: boolean }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    let reason: string | null = null;
    if (!banned) {
      reason = window.prompt(`Restrict ${name} from posting, commenting and hosting rooms? Reason (optional):`, "");
      if (reason === null) return;
    } else if (!confirm(`Let ${name} post again?`)) return;
    setBusy(true);
    const r = banned ? await send(`/api/admin/community/bans?userId=${encodeURIComponent(userId)}`, "DELETE") : await send("/api/admin/community/bans", "POST", { userId, reason: reason || null });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not update", "error");
    push(banned ? `${name} can post again` : `${name} restricted`, "success");
    router.refresh();
  };
  return (
    <Button size="sm" variant={banned ? "outline" : "ghost"} loading={busy} onClick={toggle}>
      {banned ? "Lift restriction" : "Restrict member"}
    </Button>
  );
}

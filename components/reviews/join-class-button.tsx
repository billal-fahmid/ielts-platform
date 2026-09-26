"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { send } from "@/lib/teaching/client";

/**
 * Joins a live class: the server checks the plan, the audience and the time window, records attendance, and returns
 * the meeting link, which then opens in a new tab. The link is never in the page until this succeeds.
 */
export function JoinClassButton({ classId }: { classId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const join = async () => {
    // Open the tab now, inside the click, so pop-up blockers allow it; point it at the meeting once we have the link.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    setBusy(true);
    const r = await send(`/api/classes/${classId}/join`, "POST");
    setBusy(false);
    if (!r.ok || !r.json.meetingUrl) {
      tab?.close();
      push(r.json.error || "Could not join the class", "error");
      router.refresh();
      return;
    }
    setLink(r.json.meetingUrl);
    if (tab) tab.location.href = r.json.meetingUrl;
    router.refresh();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={join} loading={busy}>
        <Video className="h-4 w-4" /> Join class
      </Button>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-primary underline" data-testid="meeting-link">
          The class didn&apos;t open? Open the meeting link
        </a>
      )}
    </div>
  );
}

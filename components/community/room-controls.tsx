"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { send } from "@/lib/teaching/client";
import { BAND_OPTIONS } from "@/lib/reviews/rules";
import { ROOM_CAPACITY_MAX, ROOM_CAPACITY_MIN, ROOM_DURATIONS, ROOM_TYPES, ROOM_TYPE_LABELS } from "@/lib/community/rules";

export function NewRoomForm() {
  const router = useRouter();
  const { push } = useToast();
  const [v, setV] = useState({ title: "", type: "", topic: "", band: "", when: "", minutes: "30", capacity: "4" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await send("/api/rooms", "POST", { title: v.title, roomType: v.type, topic: v.topic || null, targetBand: v.band === "" ? null : Number(v.band), startsAtLocal: v.when, durationMinutes: Number(v.minutes), capacity: Number(v.capacity) });
    setBusy(false);
    if (!r.ok) return push(r.json.error || "Could not create the room", "error");
    push("Room created. You're the first person in it.", "success");
    setV({ title: "", type: "", topic: "", band: "", when: "", minutes: "30", capacity: "4" });
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Room title">
          <Input value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Part 2 practice for Band 6" required maxLength={100} />
        </Field>
      </div>
      <Field label="Room type">
        <Select value={v.type} onChange={(e) => set("type", e.target.value)} required>
          <option value="">Choose…</option>
          {ROOM_TYPES.map((t) => (
            <option key={t} value={t}>
              {ROOM_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Topic (optional)">
          <Input value={v.topic} onChange={(e) => set("topic", e.target.value)} placeholder="e.g. Describe a place you would like to visit" maxLength={300} />
        </Field>
      </div>
      <Field label="Date and time (Bangladesh time)">
        <Input type="datetime-local" value={v.when} onChange={(e) => set("when", e.target.value)} required />
      </Field>
      <Field label="Length">
        <Select value={v.minutes} onChange={(e) => set("minutes", e.target.value)}>
          {ROOM_DURATIONS.map((m) => (
            <option key={m} value={m}>
              {m} minutes
            </option>
          ))}
        </Select>
      </Field>
      <Field label="People (including you)">
        <Select value={v.capacity} onChange={(e) => set("capacity", e.target.value)}>
          {Array.from({ length: ROOM_CAPACITY_MAX - ROOM_CAPACITY_MIN + 1 }, (_, i) => ROOM_CAPACITY_MIN + i).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Suggested level (optional)" hint="So people practise with others at a similar stage.">
        <Select value={v.band} onChange={(e) => set("band", e.target.value)}>
          <option value="">Any level</option>
          {BAND_OPTIONS.filter((b) => b >= 3).map((b) => (
            <option key={b} value={b}>
              Band {b.toFixed(1)}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" loading={busy}>
          Create room
        </Button>
      </div>
    </form>
  );
}

function useAction(url: string, method: string, success: string, after?: (json: any) => void) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const r = await send(url, method);
    setBusy(false);
    if (!r.ok) {
      push(r.json.error || "That didn't work", "error");
      router.refresh();
      return null;
    }
    if (success) push(success, "success");
    after?.(r.json);
    router.refresh();
    return r.json;
  };
  return { run, busy };
}

export function JoinRoomButton({ roomId, disabled }: { roomId: string; disabled?: boolean }) {
  const { run, busy } = useAction(`/api/rooms/${roomId}/join`, "POST", "You're in. The link opens 10 minutes before the start.");
  return (
    <Button size="sm" onClick={run} loading={busy} disabled={disabled}>
      Join room
    </Button>
  );
}

export function LeaveRoomButton({ roomId, isHost }: { roomId: string; isHost: boolean }) {
  const { run, busy } = useAction(`/api/rooms/${roomId}/leave`, "POST", isHost ? "Room cancelled" : "You left the room");
  return (
    <Button
      size="sm"
      variant="outline"
      loading={busy}
      onClick={() => {
        if (isHost && !confirm("You are the host, so leaving cancels the room for everyone. Continue?")) return;
        run();
      }}
    >
      {isHost ? "Cancel room" : "Leave"}
    </Button>
  );
}

/** Asks the server for the link (members only, around the session time) and opens it in a new tab. */
export function OpenRoomButton({ roomId }: { roomId: string }) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const open = async () => {
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    setBusy(true);
    const r = await send(`/api/rooms/${roomId}/link`, "POST");
    setBusy(false);
    if (!r.ok || !r.json.meetingUrl) {
      tab?.close();
      return push(r.json.error || "Could not open the room", "error");
    }
    setLink(r.json.meetingUrl);
    if (tab) tab.location.href = r.json.meetingUrl;
  };
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button size="sm" onClick={open} loading={busy}>
        <Video className="h-4 w-4" /> Open the room
      </Button>
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-primary underline" data-testid="room-link">
          Didn&apos;t open? Use this link
        </a>
      )}
    </div>
  );
}

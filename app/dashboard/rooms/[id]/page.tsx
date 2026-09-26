import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { getRoomView } from "@/lib/services/rooms";
import { formatSlotTime } from "@/lib/reviews/rules";
import { ROOM_TYPE_LABELS, type RoomType } from "@/lib/community/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JoinRoomButton, LeaveRoomButton, OpenRoomButton } from "@/components/community/room-controls";

export const metadata = { title: "Speaking room — BanglaEnglish" };

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;
  const r = getRoomView(userId, id);
  if (!r) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href="/dashboard/rooms" className="text-sm text-ink-soft hover:text-ink">
        ← Speaking rooms
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">{r.room.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {formatSlotTime(r.room.startsAt)} (Bangladesh time) · {r.room.durationMinutes} minutes · hosted by {r.hostName}
            {r.room.targetBand != null ? ` · Band ${r.room.targetBand.toFixed(1)} level` : ""}
          </p>
        </div>
        <Badge tone={r.state === "CANCELLED" ? "danger" : r.state === "LIVE" ? "success" : r.state === "FINISHED" ? "neutral" : "primary"}>{r.state === "CANCELLED" ? "Cancelled" : r.state === "LIVE" ? "Live now" : r.state === "FINISHED" ? "Finished" : "Upcoming"}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{ROOM_TYPE_LABELS[r.room.roomType as RoomType]}</Badge>
      </div>
      {r.room.topic && <Card className="p-4 text-sm text-ink">Topic: {r.room.topic}</Card>}

      <Card className="p-5">
        <h2 className="flex items-center gap-2 font-display text-lg text-ink">
          <Users className="h-4.5 w-4.5 text-primary" /> {r.count} of {r.room.capacity} seats taken
        </h2>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm" data-testid="members">
          {r.members.map((m) => (
            <li key={m.userId} className="text-ink">
              {m.name} {m.isHost && <span className="text-xs text-ink-soft">(host)</span>}
            </li>
          ))}
        </ul>
        {r.state !== "CANCELLED" && r.state !== "FINISHED" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            {r.isMember ? (
              <>
                {r.linkOpen ? <OpenRoomButton roomId={r.room.id} /> : <span className="text-xs text-ink-soft">The link opens 10 minutes before the start.</span>}
                <LeaveRoomButton roomId={r.room.id} isHost={r.isHost} />
              </>
            ) : (
              <JoinRoomButton roomId={r.room.id} disabled={r.full} />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

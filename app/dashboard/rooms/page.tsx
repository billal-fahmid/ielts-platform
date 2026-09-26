import Link from "next/link";
import { Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { isBanned } from "@/lib/services/community";
import { listRooms } from "@/lib/services/rooms";
import { formatSlotTime } from "@/lib/reviews/rules";
import { ROOM_TYPES, ROOM_TYPE_LABELS, type RoomType } from "@/lib/community/rules";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { JoinRoomButton, LeaveRoomButton, NewRoomForm, OpenRoomButton } from "@/components/community/room-controls";

export const metadata = { title: "Speaking rooms — BanglaEnglish" };

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type: rawType } = await searchParams;
  const type = (ROOM_TYPES as readonly string[]).includes(rawType ?? "") ? (rawType as RoomType) : null;
  const session = await auth();
  const userId = (session!.user as any).id;
  const restricted = isBanned(userId);
  const rooms = listRooms(userId, new Date(), type);
  const mine = rooms.filter((r) => r.isMember);
  const others = rooms.filter((r) => !r.isMember);

  const card = (r: (typeof rooms)[number]) => (
    <Card key={r.room.id} className="flex flex-col gap-3 p-4" data-testid="room-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/dashboard/rooms/${r.room.id}`} className="font-medium text-ink hover:text-primary">
            {r.room.title}
          </Link>
          <p className="mt-0.5 text-xs text-ink-soft">
            {formatSlotTime(r.room.startsAt)} · {r.room.durationMinutes} min · hosted by {r.hostName}
            {r.room.targetBand != null ? ` · Band ${r.room.targetBand.toFixed(1)} level` : ""}
          </p>
          {r.room.topic && <p className="mt-1 text-sm text-ink-soft">{r.room.topic}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="accent">{ROOM_TYPE_LABELS[r.room.roomType as RoomType]}</Badge>
          {r.state === "LIVE" && <Badge tone="success">Live now</Badge>}
          <Badge tone={r.full ? "danger" : "primary"}>
            <Users className="h-3 w-3" /> {r.count}/{r.room.capacity}
          </Badge>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {r.isMember ? (
          <>
            {r.linkOpen ? <OpenRoomButton roomId={r.room.id} /> : <span className="text-xs text-ink-soft">The link opens 10 minutes before the start.</span>}
            <LeaveRoomButton roomId={r.room.id} isHost={r.isHost} />
          </>
        ) : (
          <JoinRoomButton roomId={r.room.id} disabled={r.full || restricted} />
        )}
        {!r.isMember && r.full && <span className="text-xs text-ink-soft">This room is full.</span>}
      </div>
    </Card>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Speaking rooms</h1>
        <p className="mt-1 text-sm text-ink-soft">Practise speaking with other learners in a small video room. Join one below or host your own. Times are Bangladesh time. Be kind, and report anything that isn&apos;t.</p>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Room types" data-testid="room-types">
        <Link href="/dashboard/rooms" className={cn("rounded-full border px-3 py-1 text-xs font-medium", !type ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft hover:text-ink")}>
          All
        </Link>
        {ROOM_TYPES.map((t) => (
          <Link key={t} href={`/dashboard/rooms?type=${t}`} className={cn("rounded-full border px-3 py-1 text-xs font-medium", type === t ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft hover:text-ink")}>
            {ROOM_TYPE_LABELS[t]}
          </Link>
        ))}
      </div>

      {mine.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">My rooms</h2>
          <div className="flex flex-col gap-3" data-testid="my-rooms">
            {mine.map(card)}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink">Open rooms</h2>
        {others.length === 0 ? (
          <EmptyState icon={Users} title="No open rooms right now" description="Host one below and other learners can join you." />
        ) : (
          <div className="flex flex-col gap-3" data-testid="open-rooms">
            {others.map(card)}
          </div>
        )}
      </section>

      {!restricted && (
        <Card className="p-5">
          <h2 className="font-display text-lg text-ink">Host a room</h2>
          <div className="mt-4">
            <NewRoomForm />
          </div>
        </Card>
      )}
    </div>
  );
}

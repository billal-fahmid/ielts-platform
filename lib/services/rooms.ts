import { db } from "@/lib/db";
import { speakingRoomMembers, speakingRooms, users } from "@/lib/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { cleanText } from "@/lib/security/http";
import { notify } from "@/lib/services/notifications";
import { TeachingError } from "@/lib/services/teaching";
import { isBanned } from "@/lib/services/community";
import { jitsiProvider } from "@/lib/meetings/provider";
import { dhakaLocalToUtcIso, formatSlotTime, isValidBand } from "@/lib/reviews/rules";
import {
  canOpenRoomLink,
  displayName,
  MAX_HOSTED_ROOMS,
  MAX_JOINED_ROOMS,
  ROOM_CAPACITY_MAX,
  ROOM_CAPACITY_MIN,
  ROOM_DURATIONS,
  ROOM_MIN_LEAD_MINUTES,
  ROOM_TYPES,
  ROOM_TITLE_MAX,
  roomEnd,
  roomIsOpen,
  roomState,
  roomsOverlap,
} from "@/lib/community/rules";

export type Room = typeof speakingRooms.$inferSelect;

const getRoom = (id: string) => db.select().from(speakingRooms).where(eq(speakingRooms.id, id)).get();
const membersOf = (roomId: string) => db.select().from(speakingRoomMembers).where(eq(speakingRoomMembers.roomId, roomId)).orderBy(asc(speakingRoomMembers.joinedAt)).all();
const nameOf = (id: string) => {
  const u = db.select({ name: users.name, role: users.role }).from(users).where(eq(users.id, id)).get();
  return u ? displayName(u.name, u.role) : "Someone";
};

function assertMayHost(userId: string) {
  if (isBanned(userId)) throw new TeachingError("You can join rooms to listen, but hosting and joining are switched off for your account right now. Contact support.", 403);
}

/** Rooms a person is in that haven't finished (as host or member). */
function activeRoomsOf(userId: string, now: Date): Room[] {
  const ids = db.select({ id: speakingRoomMembers.roomId }).from(speakingRoomMembers).where(eq(speakingRoomMembers.userId, userId)).all().map((r) => r.id);
  if (!ids.length) return [];
  return db.select().from(speakingRooms).where(inArray(speakingRooms.id, ids)).all().filter((r) => roomIsOpen(r, now));
}

// ---------- Hosting ----------

export type RoomInput = { title: string; roomType: string; topic?: string | null; targetBand?: number | null; startsAtLocal: string; durationMinutes: number; capacity: number };

export function createRoom(hostId: string, input: RoomInput, now = new Date()): Room {
  assertMayHost(hostId);
  const title = cleanText(input.title ?? "");
  if (!title) throw new TeachingError("Give the room a title.");
  if (title.length > ROOM_TITLE_MAX) throw new TeachingError(`The title is too long (${ROOM_TITLE_MAX} characters at most).`);
  if (!(ROOM_TYPES as readonly string[]).includes(input.roomType)) throw new TeachingError("Choose what kind of room this is.");
  const startsAt = dhakaLocalToUtcIso(input.startsAtLocal);
  if (!startsAt) throw new TeachingError("Choose a valid date and time.");
  if (new Date(startsAt).getTime() - now.getTime() < ROOM_MIN_LEAD_MINUTES * 60_000) throw new TeachingError(`Schedule the room at least ${ROOM_MIN_LEAD_MINUTES} minutes from now.`);
  if (!(ROOM_DURATIONS as readonly number[]).includes(input.durationMinutes)) throw new TeachingError(`The room length must be ${ROOM_DURATIONS.join(", ")} minutes.`);
  if (!Number.isInteger(input.capacity) || input.capacity < ROOM_CAPACITY_MIN || input.capacity > ROOM_CAPACITY_MAX) throw new TeachingError(`A room holds ${ROOM_CAPACITY_MIN} to ${ROOM_CAPACITY_MAX} people, including you.`);
  if (input.targetBand != null && !isValidBand(input.targetBand)) throw new TeachingError("The level must be a band from 0 to 9 in steps of 0.5.");

  const hosted = db.select().from(speakingRooms).where(and(eq(speakingRooms.hostId, hostId), eq(speakingRooms.status, "SCHEDULED"))).all().filter((r) => roomIsOpen(r, now));
  if (hosted.length >= MAX_HOSTED_ROOMS) throw new TeachingError(`You can host ${MAX_HOSTED_ROOMS} upcoming rooms at a time.`);
  const candidate = { startsAt, durationMinutes: input.durationMinutes };
  if (activeRoomsOf(hostId, now).some((r) => roomsOverlap(r, candidate))) throw new TeachingError("You're already in a room at that time.");

  const id = newId();
  db.transaction((tx) => {
    tx.insert(speakingRooms)
      .values({ id, hostId, title, roomType: input.roomType as (typeof ROOM_TYPES)[number], topic: input.topic ? cleanText(input.topic).slice(0, 300) || null : null, targetBand: input.targetBand ?? null, startsAt, durationMinutes: input.durationMinutes, capacity: input.capacity, provider: "JITSI", meetingUrl: jitsiProvider.createMeeting({ classId: id, title, startsAt, durationMinutes: input.durationMinutes }).url })
      .run();
    tx.insert(speakingRoomMembers).values({ id: newId(), roomId: id, userId: hostId }).run();
  });
  return getRoom(id)!;
}

/** The host cancels the room; members are told. */
export function cancelRoom(actorId: string, actorRole: string, roomId: string, now = new Date()) {
  const r = getRoom(roomId);
  if (!r) throw new TeachingError("That room doesn't exist.", 404);
  if (r.hostId !== actorId && actorRole !== "ADMIN") throw new TeachingError("Only the host can cancel a room.", 403);
  if (r.status === "CANCELLED") throw new TeachingError("This room is already cancelled.");
  if (!roomIsOpen(r, now)) throw new TeachingError("This room has finished.");
  db.update(speakingRooms).set({ status: "CANCELLED" }).where(eq(speakingRooms.id, roomId)).run();
  for (const m of membersOf(roomId)) if (m.userId !== actorId) notify(m.userId, { type: "COMMUNITY", title: `Room cancelled: ${r.title}`, body: `The session on ${formatSlotTime(r.startsAt)} was cancelled by the host.`, url: "/dashboard/rooms" });
}

// ---------- Joining ----------

/** Joins a room. The capacity check and the insert happen together, so a full room can't be over-filled by two clicks at once. */
export function joinRoom(userId: string, roomId: string, now = new Date()): Room {
  assertMayHost(userId);
  const r = getRoom(roomId);
  if (!r) throw new TeachingError("That room doesn't exist.", 404);
  if (r.status === "CANCELLED") throw new TeachingError("This room was cancelled.");
  if (!roomIsOpen(r, now)) throw new TeachingError("This room has finished.");
  const mine = activeRoomsOf(userId, now);
  if (mine.some((x) => x.id === roomId)) throw new TeachingError("You're already in this room.");
  if (mine.length >= MAX_JOINED_ROOMS) throw new TeachingError(`You're in ${MAX_JOINED_ROOMS} rooms already. Leave one to join another.`);
  if (mine.some((x) => roomsOverlap(x, r))) throw new TeachingError("You're already in a room at that time.");

  db.transaction((tx) => {
    const count = tx.select().from(speakingRoomMembers).where(eq(speakingRoomMembers.roomId, roomId)).all().length;
    if (count >= r.capacity) throw new TeachingError("This room is full.");
    tx.insert(speakingRoomMembers).values({ id: newId(), roomId, userId }).run();
  });
  if (r.hostId !== userId) notify(r.hostId, { type: "COMMUNITY", title: `${nameOf(userId)} joined your room`, body: r.title, url: `/dashboard/rooms/${roomId}` });
  return r;
}

/** Leaves a room. A host leaving cancels it, because nobody else can run it. */
export function leaveRoom(userId: string, roomId: string, now = new Date()) {
  const r = getRoom(roomId);
  if (!r) throw new TeachingError("That room doesn't exist.", 404);
  const member = db.select().from(speakingRoomMembers).where(and(eq(speakingRoomMembers.roomId, roomId), eq(speakingRoomMembers.userId, userId))).get();
  if (!member) throw new TeachingError("You aren't in this room.");
  if (r.hostId === userId) {
    cancelRoom(userId, "STUDENT", roomId, now);
    return { cancelled: true };
  }
  db.delete(speakingRoomMembers).where(eq(speakingRoomMembers.id, member.id)).run();
  return { cancelled: false };
}

// ---------- Views ----------

function decorate(r: Room, viewerId: string, now: Date) {
  const members = membersOf(r.id);
  const isMember = members.some((m) => m.userId === viewerId);
  return {
    room: { ...r, meetingUrl: undefined as string | undefined },
    state: roomState(r, now),
    hostName: nameOf(r.hostId),
    members: members.map((m) => ({ userId: m.userId, name: nameOf(m.userId), isHost: m.userId === r.hostId })),
    count: members.length,
    full: members.length >= r.capacity,
    isMember,
    isHost: r.hostId === viewerId,
    linkOpen: isMember && canOpenRoomLink(r, now),
  };
}

/** Upcoming and live rooms anyone can join, soonest first. The meeting link is never included here. */
export function listRooms(viewerId: string, now = new Date(), roomType?: string | null) {
  return db
    .select()
    .from(speakingRooms)
    .where(eq(speakingRooms.status, "SCHEDULED"))
    .orderBy(asc(speakingRooms.startsAt))
    .all()
    .filter((r) => roomEnd(r) > now.getTime() && (!roomType || r.roomType === roomType))
    .map((r) => decorate(r, viewerId, now));
}

export function getRoomView(viewerId: string, roomId: string, now = new Date()) {
  const r = getRoom(roomId);
  return r ? decorate(r, viewerId, now) : null;
}

/** The meeting link, for members only and only around the session time. */
export function roomLink(userId: string, roomId: string, now = new Date()): { meetingUrl: string } {
  const r = getRoom(roomId);
  if (!r || !membersOf(roomId).some((m) => m.userId === userId)) throw new TeachingError("That room isn't available to you.", 404);
  if (r.status === "CANCELLED") throw new TeachingError("This room was cancelled.");
  if (!canOpenRoomLink(r, now)) throw new TeachingError(roomState(r, now) === "UPCOMING" ? "The room opens 10 minutes before it starts." : "This room has finished.");
  return { meetingUrl: r.meetingUrl };
}

export const hostedRoomCount = (userId: string, now = new Date()) => db.select().from(speakingRooms).where(and(eq(speakingRooms.hostId, userId), eq(speakingRooms.status, "SCHEDULED"))).all().filter((r) => roomIsOpen(r, now)).length;

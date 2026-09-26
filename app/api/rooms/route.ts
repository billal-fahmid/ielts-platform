import { z } from "zod";
import { createRoom } from "@/lib/services/rooms";
import { memberRoute } from "@/lib/community/route";

const schema = z.object({
  title: z.string(),
  roomType: z.string().min(1, "Choose what kind of room this is."),
  topic: z.string().nullish(),
  targetBand: z.number().nullish(),
  /** Bangladesh time as typed in a "datetime-local" box, e.g. 2026-10-05T18:30. */
  startsAtLocal: z.string().min(1, "Choose a date and time."),
  durationMinutes: z.number("Choose how long the room is."),
  capacity: z.number("Choose how many people the room holds."),
});

/** Hosts a speaking-practice room. The host is the first member. */
export async function POST(req: Request) {
  return memberRoute(req, { schema, path: "/api/rooms", limit: 20 }, ({ user, body }) => {
    const room = createRoom(user.id, body);
    return { room: { id: room.id } };
  });
}

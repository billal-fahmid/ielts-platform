import { leaveRoom } from "@/lib/services/rooms";
import { memberRoute } from "@/lib/community/route";

/** Gives up a seat. If the host leaves, the room is cancelled. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return memberRoute(req, { path: `/api/rooms/${id}/leave`, limit: 30 }, ({ user }) => leaveRoom(user.id, id));
}

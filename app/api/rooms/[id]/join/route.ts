import { joinRoom } from "@/lib/services/rooms";
import { memberRoute } from "@/lib/community/route";

/** Takes a seat in a room. Full rooms and overlapping sessions are refused. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return memberRoute(req, { path: `/api/rooms/${id}/join`, limit: 30 }, ({ user }) => {
    joinRoom(user.id, id);
  });
}

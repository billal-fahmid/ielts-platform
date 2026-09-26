import { cancelRoom } from "@/lib/services/rooms";
import { memberRoute } from "@/lib/community/route";

/** The host cancels a room; members are told. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return memberRoute(req, { path: `/api/rooms/${id}` }, ({ user }) => {
    cancelRoom(user.id, user.role, id);
  });
}

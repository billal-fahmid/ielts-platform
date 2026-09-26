import { roomLink } from "@/lib/services/rooms";
import { memberRoute } from "@/lib/community/route";

/** The meeting link, for members only and only around the session time. Never included in the room pages. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return memberRoute(req, { path: `/api/rooms/${id}/link`, limit: 30 }, ({ user }) => roomLink(user.id, id));
}

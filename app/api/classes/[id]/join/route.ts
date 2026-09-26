import { joinClass } from "@/lib/services/live-classes";
import { studentRoute } from "@/lib/reviews/route";

/**
 * The Join button. Only students the class is for, on a plan with live classes, within the join window.
 * It records attendance and returns the meeting link, which is never sent to anyone else.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return studentRoute(req, { path: `/api/classes/${id}/join`, feature: "LIVE_CLASSES" }, ({ user }) => joinClass(user.id, id));
}

import { cancelBooking } from "@/lib/services/speaking-sessions";
import { studentRoute } from "@/lib/reviews/route";

/** A student gives a booking back (until two hours before it starts). Works on any plan. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return studentRoute(req, { path: `/api/speaking-sessions/${id}/cancel` }, ({ user }) => {
    cancelBooking(user.id, id);
  });
}

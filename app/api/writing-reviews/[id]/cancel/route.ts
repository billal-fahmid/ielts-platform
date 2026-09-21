import { cancelRequest } from "@/lib/services/writing-reviews";
import { studentRoute } from "@/lib/reviews/route";

/** A student withdraws a review request no teacher has picked up. Works on any plan, so nobody is stuck with a request. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return studentRoute(req, { path: `/api/writing-reviews/${id}/cancel` }, ({ user }) => {
    cancelRequest(user.id, id);
  });
}

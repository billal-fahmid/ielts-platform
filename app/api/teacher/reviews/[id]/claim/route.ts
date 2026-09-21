import { audit } from "@/lib/security/audit";
import { claimReview } from "@/lib/services/writing-reviews";
import { teacherRoute } from "@/lib/teaching/route";

/** Picks a queued review up. Only one teacher can win a request. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { path: `/api/teacher/reviews/${id}/claim` }, ({ user }) => {
    claimReview(user.id, id);
    audit({ actorId: user.id, actorRole: user.role, action: "writing_review.claim", entityType: "writing_reviews", entityId: id }, req);
  });
}

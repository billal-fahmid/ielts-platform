import { audit } from "@/lib/security/audit";
import { releaseReview } from "@/lib/services/writing-reviews";
import { teacherRoute } from "@/lib/teaching/route";

/** Puts an unfinished review back in the queue for another teacher. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { path: `/api/teacher/reviews/${id}/release` }, ({ user }) => {
    releaseReview(user.id, id);
    audit({ actorId: user.id, actorRole: user.role, action: "writing_review.release", entityType: "writing_reviews", entityId: id }, req);
  });
}

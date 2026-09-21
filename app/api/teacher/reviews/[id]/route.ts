import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { saveReview } from "@/lib/services/writing-reviews";
import { teacherRoute } from "@/lib/teaching/route";

const schema = z.object({
  bandEstimate: z.number("Give a band estimate from 0 to 9.").nullish(),
  taskResponseFeedback: z.string().nullish(),
  coherenceFeedback: z.string().nullish(),
  vocabularyFeedback: z.string().nullish(),
  grammarFeedback: z.string().nullish(),
  overallComments: z.string().nullish(),
  /** True publishes the review to the student. */
  complete: z.boolean().optional(),
});

/** Saves the teacher's feedback on an essay they picked up; `complete` sends it to the student. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { schema, path: `/api/teacher/reviews/${id}` }, ({ user, body }) => {
    const { complete, ...input } = body;
    const review = saveReview(user.id, id, input, !!complete);
    audit({ actorId: user.id, actorRole: user.role, action: complete ? "writing_review.complete" : "writing_review.save", entityType: "writing_reviews", entityId: id, metadata: { band: review.bandEstimate } }, req);
    return { review: { id: review.id, status: review.status } };
  });
}

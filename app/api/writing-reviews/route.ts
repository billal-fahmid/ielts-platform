import { z } from "zod";
import { requestReview } from "@/lib/services/writing-reviews";
import { studentRoute } from "@/lib/reviews/route";

const schema = z.object({ submissionId: z.string().min(1), note: z.string().max(1000).nullish() });

/** A student asks a teacher to review one of their essays (Pro plan). */
export async function POST(req: Request) {
  return studentRoute(req, { schema, path: "/api/writing-reviews", feature: "TEACHER_FEEDBACK" }, ({ user, body }) => {
    const review = requestReview(user.id, body.submissionId, body.note);
    return { review: { id: review.id, status: review.status } };
  });
}

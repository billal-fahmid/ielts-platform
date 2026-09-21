import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { gradeSubmission } from "@/lib/services/assignments";
import { teacherRoute } from "@/lib/teaching/route";

const schema = z.object({
  score: z.number("Enter the score as a whole number."),
  feedback: z.string().nullish(),
});

/** Scores a student's submission and leaves feedback. The student is told. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; submissionId: string }> }) {
  const { id, submissionId } = await params;
  return teacherRoute(req, { schema, path: `/api/teacher/assignments/${id}/submissions/${submissionId}` }, ({ user, body }) => {
    const submission = gradeSubmission(user.id, id, submissionId, body);
    audit({ actorId: user.id, actorRole: user.role, action: "assignment.grade", entityType: "assignment_submissions", entityId: submissionId, metadata: { score: body.score } }, req);
    return { submission };
  });
}

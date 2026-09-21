import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { createAssignment } from "@/lib/services/assignments";
import { teacherRoute } from "@/lib/teaching/route";

const schema = z.object({
  title: z.string().min(1, "Give the assignment a title."),
  instructions: z.string().min(1, "Write the instructions students should follow."),
  batchId: z.string().nullish(),
  courseId: z.string().nullish(),
  attachmentUrl: z.string().nullish(),
  dueAt: z.string().nullish(),
  maxScore: z.number().optional(),
  published: z.boolean().optional(),
});

export async function POST(req: Request) {
  return teacherRoute(req, { schema, path: "/api/teacher/assignments" }, ({ user, body }) => {
    const assignment = createAssignment(user.id, body);
    audit({ actorId: user.id, actorRole: user.role, action: "assignment.create", entityType: "assignments", entityId: assignment.id, metadata: { published: assignment.published } }, req);
    return { assignment };
  });
}

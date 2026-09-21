import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { deleteAssignment, updateAssignment } from "@/lib/services/assignments";
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { schema, path: `/api/teacher/assignments/${id}` }, ({ user, body }) => {
    const assignment = updateAssignment(user.id, id, body);
    audit({ actorId: user.id, actorRole: user.role, action: "assignment.update", entityType: "assignments", entityId: id, metadata: { published: assignment.published } }, req);
    return { assignment };
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { path: `/api/teacher/assignments/${id}` }, ({ user }) => {
    deleteAssignment(user.id, id);
    audit({ actorId: user.id, actorRole: user.role, action: "assignment.delete", entityType: "assignments", entityId: id }, req);
  });
}

import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { deleteBatch, updateBatch } from "@/lib/services/teaching";
import { teacherRoute } from "@/lib/teaching/route";

const schema = z.object({
  name: z.string().min(1, "Give the batch a name."),
  description: z.string().nullish(),
  courseId: z.string().nullish(),
  capacity: z.number().nullish(),
  startsOn: z.string().nullish(),
  endsOn: z.string().nullish(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { schema, path: `/api/teacher/batches/${id}` }, ({ user, body }) => {
    const batch = updateBatch(user.id, id, body);
    audit({ actorId: user.id, actorRole: user.role, action: "batch.update", entityType: "batches", entityId: id }, req);
    return { batch };
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { path: `/api/teacher/batches/${id}` }, ({ user }) => {
    deleteBatch(user.id, id);
    audit({ actorId: user.id, actorRole: user.role, action: "batch.delete", entityType: "batches", entityId: id }, req);
  });
}

import { audit } from "@/lib/security/audit";
import { classSchema } from "@/lib/classes/schema";
import { cancelClass, updateClass } from "@/lib/services/live-classes";
import { teacherRoute } from "@/lib/teaching/route";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { schema: classSchema, path: `/api/teacher/classes/${id}` }, ({ user, body }) => {
    const c = updateClass(user.id, id, body);
    audit({ actorId: user.id, actorRole: user.role, action: "live_class.update", entityType: "live_classes", entityId: id }, req);
    return { class: { id: c.id } };
  });
}

/** Cancels a class that has not finished; the audience is told (the optional ?reason= is shown to them). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reason = new URL(req.url).searchParams.get("reason");
  return teacherRoute(req, { path: `/api/teacher/classes/${id}` }, ({ user }) => {
    cancelClass(user.id, id, reason);
    audit({ actorId: user.id, actorRole: user.role, action: "live_class.cancel", entityType: "live_classes", entityId: id }, req);
  });
}

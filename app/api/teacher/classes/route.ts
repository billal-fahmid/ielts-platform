import { audit } from "@/lib/security/audit";
import { classSchema } from "@/lib/classes/schema";
import { createClass } from "@/lib/services/live-classes";
import { teacherRoute } from "@/lib/teaching/route";

/** Schedules a live class for a batch or a course. The audience is told. */
export async function POST(req: Request) {
  return teacherRoute(req, { schema: classSchema, path: "/api/teacher/classes" }, ({ user, body }) => {
    const c = createClass(user.id, body);
    audit({ actorId: user.id, actorRole: user.role, action: "live_class.create", entityType: "live_classes", entityId: c.id }, req);
    return { class: { id: c.id } };
  });
}

import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { setRecording } from "@/lib/services/live-classes";
import { teacherRoute } from "@/lib/teaching/route";

const schema = z.object({ url: z.string().nullable() });

/** Adds, replaces or (with null) removes the class recording. The audience is told the first time. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { schema, path: `/api/teacher/classes/${id}/recording` }, ({ user, body }) => {
    setRecording(user.id, id, body.url);
    audit({ actorId: user.id, actorRole: user.role, action: "live_class.recording", entityType: "live_classes", entityId: id }, req);
  });
}

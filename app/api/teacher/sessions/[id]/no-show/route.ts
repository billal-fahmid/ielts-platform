import { audit } from "@/lib/security/audit";
import { markNoShow } from "@/lib/services/speaking-sessions";
import { teacherRoute } from "@/lib/teaching/route";

/** Marks a booked session as missed by the student (10 minutes after the start time). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { path: `/api/teacher/sessions/${id}/no-show` }, ({ user }) => {
    markNoShow(user.id, id);
    audit({ actorId: user.id, actorRole: user.role, action: "speaking_session.no_show", entityType: "speaking_slots", entityId: id }, req);
  });
}

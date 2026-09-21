import { audit } from "@/lib/security/audit";
import { startSession } from "@/lib/services/speaking-sessions";
import { teacherRoute } from "@/lib/teaching/route";

/** Starts a booked session (from 10 minutes before it begins). The student is told to join. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { path: `/api/teacher/sessions/${id}/start` }, ({ user }) => {
    startSession(user.id, id);
    audit({ actorId: user.id, actorRole: user.role, action: "speaking_session.start", entityType: "speaking_slots", entityId: id }, req);
  });
}

import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { setAttendance } from "@/lib/services/live-classes";
import { teacherRoute } from "@/lib/teaching/route";

const schema = z.object({ studentId: z.string().min(1), status: z.enum(["PRESENT", "LATE", "ABSENT"]).nullable() });

/** Sets a student's attendance, or clears it with status null. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { schema, path: `/api/teacher/classes/${id}/attendance` }, ({ user, body }) => {
    setAttendance(user.id, id, body.studentId, body.status);
    audit({ actorId: user.id, actorRole: user.role, action: "live_class.attendance", entityType: "live_classes", entityId: id, metadata: { studentId: body.studentId, status: body.status } }, req);
  });
}

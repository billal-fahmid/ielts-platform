import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { createSlot } from "@/lib/services/speaking-sessions";
import { teacherRoute } from "@/lib/teaching/route";

const schema = z.object({
  /** Bangladesh time as typed in a "datetime-local" box, e.g. 2026-10-05T18:30. */
  startsAtLocal: z.string().min(1, "Choose a date and time."),
  durationMinutes: z.number("Choose how long the session is."),
  meetingUrl: z.string().min(1, "Add the meeting link (Zoom, Google Meet...)."),
});

/** Publishes a bookable speaking-session time. */
export async function POST(req: Request) {
  return teacherRoute(req, { schema, path: "/api/teacher/sessions" }, ({ user, body }) => {
    const slot = createSlot(user.id, body);
    audit({ actorId: user.id, actorRole: user.role, action: "speaking_slot.create", entityType: "speaking_slots", entityId: slot.id }, req);
    return { session: { id: slot.id, startsAt: slot.startsAt } };
  });
}

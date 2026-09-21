import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { cancelSlot, saveSession } from "@/lib/services/speaking-sessions";
import { teacherRoute } from "@/lib/teaching/route";

const band = z.number("Bands are numbers from 0 to 9.").nullish();
const schema = z.object({
  teacherNotes: z.string().nullish(),
  fluencyBand: band,
  lexicalBand: band,
  grammarBand: band,
  pronunciationBand: band,
  overallBand: band,
  feedback: z.string().nullish(),
  /** True finishes the session and shows the scores and feedback to the student. */
  complete: z.boolean().optional(),
});

/** Saves notes, scores and feedback for a started session. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { schema, path: `/api/teacher/sessions/${id}` }, ({ user, body }) => {
    const { complete, ...input } = body;
    const slot = saveSession(user.id, id, input, !!complete);
    audit({ actorId: user.id, actorRole: user.role, action: complete ? "speaking_session.complete" : "speaking_session.save", entityType: "speaking_slots", entityId: id, metadata: { overall: slot.overallBand } }, req);
    return { session: { id: slot.id, status: slot.status } };
  });
}

/** Removes an open slot, or cancels a booked one (the student is told, with the optional ?reason=). */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reason = new URL(req.url).searchParams.get("reason");
  return teacherRoute(req, { path: `/api/teacher/sessions/${id}` }, ({ user }) => {
    cancelSlot(user.id, id, reason);
    audit({ actorId: user.id, actorRole: user.role, action: "speaking_slot.cancel", entityType: "speaking_slots", entityId: id }, req);
  });
}

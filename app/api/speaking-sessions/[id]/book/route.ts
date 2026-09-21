import { z } from "zod";
import { bookSlot } from "@/lib/services/speaking-sessions";
import { studentRoute } from "@/lib/reviews/route";

const schema = z.object({ note: z.string().max(1000).nullish() });

/** A student books an open one-to-one speaking slot (Pro plan). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return studentRoute(req, { schema, path: `/api/speaking-sessions/${id}/book`, feature: "ONE_ON_ONE" }, ({ user, body }) => {
    const slot = bookSlot(user.id, id, body.note);
    return { session: { id: slot.id, startsAt: slot.startsAt, status: slot.status } };
  });
}

import { z } from "zod";
import { acceptAnswer } from "@/lib/services/community";
import { memberRoute } from "@/lib/community/route";

const schema = z.object({ commentId: z.string().nullable() });

/** Marks a comment as the accepted answer to a question (or clears it with null). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return memberRoute(req, { schema, path: `/api/community/posts/${id}/accept` }, ({ user, body }) => {
    acceptAnswer({ id: user.id, role: user.role }, id, body.commentId);
  });
}

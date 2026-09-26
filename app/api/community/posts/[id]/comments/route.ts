import { z } from "zod";
import { addComment } from "@/lib/services/community";
import { memberRoute } from "@/lib/community/route";

const schema = z.object({ body: z.string() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return memberRoute(req, { schema, path: `/api/community/posts/${id}/comments`, limit: 30 }, ({ user, body }) => {
    const c = addComment(user.id, id, body.body);
    return { comment: { id: c.id } };
  });
}

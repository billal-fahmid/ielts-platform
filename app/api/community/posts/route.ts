import { z } from "zod";
import { createPost } from "@/lib/services/community";
import { memberRoute } from "@/lib/community/route";

const schema = z.object({
  kind: z.string().min(1),
  categoryId: z.string().nullish(),
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()).max(20).optional(),
});

/** Starts a discussion or asks a question. */
export async function POST(req: Request) {
  return memberRoute(req, { schema, path: "/api/community/posts", limit: 20 }, ({ user, body }) => {
    const post = createPost(user.id, body);
    return { post: { id: post.id } };
  });
}

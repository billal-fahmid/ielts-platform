import { z } from "zod";
import { toggleLike } from "@/lib/services/community";
import { memberRoute } from "@/lib/community/route";

const schema = z.object({ targetType: z.enum(["POST", "COMMENT"]), targetId: z.string().min(1) });

/** Likes or un-likes a post or comment. */
export async function POST(req: Request) {
  return memberRoute(req, { schema, path: "/api/community/like", limit: 120 }, ({ user, body }) => toggleLike(user.id, body.targetType, body.targetId));
}

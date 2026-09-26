import { z } from "zod";
import { reportContent } from "@/lib/services/community";
import { memberRoute } from "@/lib/community/route";

const schema = z.object({ targetType: z.enum(["POST", "COMMENT"]), targetId: z.string().min(1), reason: z.string().min(1, "Choose a reason."), details: z.string().max(500).nullish() });

/** Reports a post or comment to the moderators. Several different reports hide it until a moderator decides. */
export async function POST(req: Request) {
  return memberRoute(req, { schema, path: "/api/community/report", limit: 20 }, ({ user, body }) => reportContent(user.id, body.targetType, body.targetId, body.reason, body.details));
}

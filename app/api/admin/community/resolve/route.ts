import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { resolveReports } from "@/lib/services/community";
import { memberRoute } from "@/lib/community/route";

const schema = z.object({ targetType: z.enum(["POST", "COMMENT"]), targetId: z.string().min(1), action: z.enum(["HIDE", "RESTORE", "DISMISS", "DELETE"]) });

/** A moderator's decision on reported content: hide it, restore it, dismiss the reports, or delete it. */
export async function POST(req: Request) {
  return memberRoute(req, { schema, path: "/api/admin/community/resolve", roles: ["ADMIN"] }, ({ user, body }) => {
    resolveReports({ id: user.id, role: user.role }, body.targetType, body.targetId, body.action);
    audit({ actorId: user.id, actorRole: user.role, action: `community.${body.action.toLowerCase()}`, entityType: body.targetType === "POST" ? "community_posts" : "community_comments", entityId: body.targetId }, req);
  });
}

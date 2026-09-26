import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { setPinned } from "@/lib/services/community";
import { memberRoute } from "@/lib/community/route";

const schema = z.object({ postId: z.string().min(1), pinned: z.boolean() });

export async function POST(req: Request) {
  return memberRoute(req, { schema, path: "/api/admin/community/pin", roles: ["ADMIN"] }, ({ user, body }) => {
    setPinned({ id: user.id, role: user.role }, body.postId, body.pinned);
    audit({ actorId: user.id, actorRole: user.role, action: body.pinned ? "community.pin" : "community.unpin", entityType: "community_posts", entityId: body.postId }, req);
  });
}

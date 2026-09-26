import { audit } from "@/lib/security/audit";
import { deleteComment } from "@/lib/services/community";
import { memberRoute } from "@/lib/community/route";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return memberRoute(req, { path: `/api/community/comments/${id}` }, ({ user }) => {
    deleteComment({ id: user.id, role: user.role }, id);
    if (user.role === "ADMIN") audit({ actorId: user.id, actorRole: user.role, action: "community.comment_delete", entityType: "community_comments", entityId: id }, req);
  });
}

import { audit } from "@/lib/security/audit";
import { deletePost } from "@/lib/services/community";
import { memberRoute } from "@/lib/community/route";

/** The author deletes their own post (moderators can delete any). Its replies go with it. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return memberRoute(req, { path: `/api/community/posts/${id}` }, ({ user }) => {
    deletePost({ id: user.id, role: user.role }, id);
    if (user.role === "ADMIN") audit({ actorId: user.id, actorRole: user.role, action: "community.post_delete", entityType: "community_posts", entityId: id }, req);
  });
}

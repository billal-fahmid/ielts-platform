import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { banUser, unbanUser } from "@/lib/services/community";
import { memberRoute } from "@/lib/community/route";
import { TeachingError } from "@/lib/services/teaching";

const schema = z.object({ userId: z.string().min(1), reason: z.string().max(300).nullish() });

/** Restricts a student from posting, commenting, liking and hosting rooms. They can still read. */
export async function POST(req: Request) {
  return memberRoute(req, { schema, path: "/api/admin/community/bans", roles: ["ADMIN"] }, ({ user, body }) => {
    banUser({ id: user.id, role: user.role }, body.userId, body.reason);
    audit({ actorId: user.id, actorRole: user.role, action: "community.ban", entityType: "users", entityId: body.userId }, req);
  });
}

export async function DELETE(req: Request) {
  return memberRoute(req, { path: "/api/admin/community/bans", roles: ["ADMIN"] }, ({ user }) => {
    const userId = new URL(req.url).searchParams.get("userId");
    if (!userId) throw new TeachingError("Choose a member.", 400);
    unbanUser({ id: user.id, role: user.role }, userId);
    audit({ actorId: user.id, actorRole: user.role, action: "community.unban", entityType: "users", entityId: userId }, req);
  });
}

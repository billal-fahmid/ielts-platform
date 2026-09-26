import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { setRevoked } from "@/lib/services/certificates";
import { memberRoute } from "@/lib/community/route";

const schema = z.object({ revoked: z.boolean(), reason: z.string().max(300).nullish() });

/** An administrator revokes a certificate (the public page then says so) or restores it. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return memberRoute(req, { schema, path: `/api/admin/certificates/${id}`, roles: ["ADMIN"] }, ({ user, body }) => {
    setRevoked(user.role, id, body.revoked, body.reason);
    audit({ actorId: user.id, actorRole: user.role, action: body.revoked ? "certificate.revoke" : "certificate.restore", entityType: "certificates", entityId: id }, req);
  });
}

import { NextResponse } from "next/server";
import { updateResource, deleteResource, resources, ResourceError } from "@/lib/admin/resources";
import { updateUserRole } from "@/lib/services/users";
import { requireRole } from "@/lib/security/guards";
import { ADMIN_ONLY_RESOURCES, TEACHER_OWNED_RESOURCES } from "@/lib/admin/access";
import { audit } from "@/lib/security/audit";
import { rateLimit } from "@/lib/security/rate-limit";
import { logError } from "@/lib/security/error-log";

const ROLES = new Set(["STUDENT", "TEACHER", "ADMIN"]);

async function guard(resource: string) {
  return ADMIN_ONLY_RESOURCES.has(resource) || TEACHER_OWNED_RESOURCES.has(resource) ? requireRole("ADMIN") : requireRole("ADMIN", "TEACHER");
}

export async function PATCH(req: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  const g = await guard(resource);
  if (!g.ok) return g.response;
  if (!resources[resource]) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  const limited = rateLimit(req, { name: "admin-write", limit: 120, windowSeconds: 60, key: g.user.id });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    if (resource === "users" && body.role) {
      if (!ROLES.has(body.role)) return NextResponse.json({ error: "Unknown role." }, { status: 400 });
      if (id === g.user.id && body.role !== g.user.role) return NextResponse.json({ error: "You can't change your own role." }, { status: 400 });
      updateUserRole(id, body.role);
      audit({ actorId: g.user.id, actorRole: g.user.role, action: "user.role_change", entityType: "users", entityId: id, metadata: { newRole: body.role } }, req);
    } else {
      updateResource(resource, id, body);
      audit({ actorId: g.user.id, actorRole: g.user.role, action: "resource.update", entityType: resource, entityId: id, metadata: { fields: Object.keys(body) } }, req);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (!(e instanceof ResourceError)) logError("api:/api/admin/" + resource, e, { method: "PATCH", userId: g.user.id });
    return NextResponse.json({ error: e.message ?? "Could not update" }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  const g = await guard(resource);
  if (!g.ok) return g.response;
  if (!resources[resource]) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  if (resource === "users" && id === g.user.id) return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  if (resources[resource].canDelete === false) return NextResponse.json({ error: "Records in this list can't be deleted." }, { status: 405 });

  try {
    deleteResource(resource, id);
    audit({ actorId: g.user.id, actorRole: g.user.role, action: "resource.delete", entityType: resource, entityId: id }, req);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (!(e instanceof ResourceError)) logError("api:/api/admin/" + resource, e, { method: "DELETE", userId: g.user.id });
    return NextResponse.json({ error: e.message ?? "Could not delete" }, { status: 400 });
  }
}

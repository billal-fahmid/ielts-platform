import { NextResponse } from "next/server";
import { listResource, createResource, resources, ResourceError } from "@/lib/admin/resources";
import { requireRole } from "@/lib/security/guards";
import { ADMIN_ONLY_RESOURCES } from "@/lib/admin/access";
import { audit } from "@/lib/security/audit";
import { rateLimit } from "@/lib/security/rate-limit";
import { logError } from "@/lib/security/error-log";

async function guard(resource: string) {
  return ADMIN_ONLY_RESOURCES.has(resource) ? requireRole("ADMIN") : requireRole("ADMIN", "TEACHER");
}

export async function GET(_req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const g = await guard(resource);
  if (!g.ok) return g.response;
  if (!resources[resource]) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  return NextResponse.json({ items: listResource(resource) });
}

export async function POST(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const g = await guard(resource);
  if (!g.ok) return g.response;
  if (!resources[resource]) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  if (resource === "users") return NextResponse.json({ error: "Accounts are created through registration." }, { status: 405 });
  if (resources[resource].canCreate === false) return NextResponse.json({ error: "New records can't be added to this list." }, { status: 405 });
  const limited = rateLimit(req, { name: "admin-write", limit: 120, windowSeconds: 60, key: g.user.id });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    const item = createResource(resource, body);
    audit({ actorId: g.user.id, actorRole: g.user.role, action: "resource.create", entityType: resource, entityId: item?.id, metadata: { fields: Object.keys(body) } }, req);
    return NextResponse.json({ item });
  } catch (e: any) {
    if (!(e instanceof ResourceError)) logError("api:/api/admin/" + resource, e, { method: "POST", userId: g.user.id });
    return NextResponse.json({ error: e.message ?? "Could not create" }, { status: 400 });
  }
}

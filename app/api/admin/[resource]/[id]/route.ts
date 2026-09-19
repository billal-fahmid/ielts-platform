import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateResource, deleteResource, resources } from "@/lib/admin/resources";
import { updateUserRole } from "@/lib/services/users";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "TEACHER")) return null;
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { resource, id } = await params;
  if (!resources[resource]) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    if (resource === "users" && body.role) {
      updateUserRole(id, body.role);
    } else {
      updateResource(resource, id, body);
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Could not update" }, { status: 400 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ resource: string; id: string }> }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { resource, id } = await params;
  if (!resources[resource]) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });

  try {
    deleteResource(resource, id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Could not delete" }, { status: 400 });
  }
}

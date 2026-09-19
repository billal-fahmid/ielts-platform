import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listResource, createResource, resources } from "@/lib/admin/resources";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "TEACHER")) return null;
  return session;
}

export async function GET(_req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { resource } = await params;
  if (!resources[resource]) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  return NextResponse.json({ items: listResource(resource) });
}

export async function POST(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { resource } = await params;
  if (!resources[resource]) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    const item = createResource(resource, body);
    return NextResponse.json({ item });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Could not create" }, { status: 400 });
  }
}

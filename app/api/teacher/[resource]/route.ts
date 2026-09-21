import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/security/guards";
import { audit } from "@/lib/security/audit";
import { canTeacherUse, createForTeacher, listForTeacher } from "@/lib/services/teacher-content";
import { teacherRoute } from "@/lib/teaching/route";

const body = z.record(z.string(), z.unknown());

/** The teacher's own content of one kind (their courses, or the modules, lessons... inside them). */
export async function GET(_req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  const g = await requireRole("TEACHER");
  if (!g.ok) return g.response;
  if (!canTeacherUse(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  return NextResponse.json({ items: listForTeacher(g.user.id, resource) });
}

export async function POST(req: Request, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!canTeacherUse(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  return teacherRoute(req, { schema: body, path: `/api/teacher/${resource}` }, ({ user, body }) => {
    const item = createForTeacher(user.id, resource, body);
    audit({ actorId: user.id, actorRole: user.role, action: "resource.create", entityType: resource, entityId: item?.id, metadata: { fields: Object.keys(body), via: "teacher" } }, req);
    return { item };
  });
}

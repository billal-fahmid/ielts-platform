import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { canTeacherUse, deleteForTeacher, updateForTeacher } from "@/lib/services/teacher-content";
import { teacherRoute } from "@/lib/teaching/route";

const body = z.record(z.string(), z.unknown());

export async function PATCH(req: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  if (!canTeacherUse(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  return teacherRoute(req, { schema: body, path: `/api/teacher/${resource}/${id}` }, ({ user, body }) => {
    updateForTeacher(user.id, resource, id, body);
    audit({ actorId: user.id, actorRole: user.role, action: "resource.update", entityType: resource, entityId: id, metadata: { fields: Object.keys(body), via: "teacher" } }, req);
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await params;
  if (!canTeacherUse(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  return teacherRoute(req, { path: `/api/teacher/${resource}/${id}` }, ({ user }) => {
    deleteForTeacher(user.id, resource, id);
    audit({ actorId: user.id, actorRole: user.role, action: "resource.delete", entityType: resource, entityId: id, metadata: { via: "teacher" } }, req);
  });
}

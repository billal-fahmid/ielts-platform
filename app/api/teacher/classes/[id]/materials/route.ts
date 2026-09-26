import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { addMaterial, removeMaterial } from "@/lib/services/live-classes";
import { teacherRoute } from "@/lib/teaching/route";
import { TeachingError } from "@/lib/services/teaching";

const schema = z.object({ title: z.string().min(1, "Give the material a name."), url: z.string().min(1, "Add an uploaded file or a link.") });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { schema, path: `/api/teacher/classes/${id}/materials` }, ({ user, body }) => {
    const m = addMaterial(user.id, id, body);
    audit({ actorId: user.id, actorRole: user.role, action: "live_class.material_add", entityType: "live_classes", entityId: id }, req);
    return { material: m };
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { path: `/api/teacher/classes/${id}/materials` }, ({ user }) => {
    const materialId = new URL(req.url).searchParams.get("materialId");
    if (!materialId) throw new TeachingError("Choose a material to remove.", 400);
    removeMaterial(user.id, id, materialId);
    audit({ actorId: user.id, actorRole: user.role, action: "live_class.material_remove", entityType: "live_classes", entityId: id }, req);
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { audit } from "@/lib/security/audit";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { addMemberByEmail, removeMember, TeachingError } from "@/lib/services/teaching";
import { teacherRoute } from "@/lib/teaching/route";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Enter the student's email address.") });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { schema, path: `/api/teacher/batches/${id}/members` }, ({ user, body }) => {
    // Adding by email reveals whether an address has a student account, so guessing addresses is slowed down.
    if (!checkRateLimit("teacher-add-member", user.id, 30, 600).ok) throw new TeachingError("Too many attempts. Please wait a few minutes and try again.", 429);
    const member = addMemberByEmail(user.id, id, body.email);
    audit({ actorId: user.id, actorRole: user.role, action: "batch.add_member", entityType: "batches", entityId: id, metadata: { studentId: member.studentId } }, req);
    return { member };
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return teacherRoute(req, { path: `/api/teacher/batches/${id}/members` }, ({ user }) => {
    const studentId = new URL(req.url).searchParams.get("studentId");
    if (!studentId) throw new TeachingError("Choose a student to remove.", 400);
    removeMember(user.id, id, studentId);
    audit({ actorId: user.id, actorRole: user.role, action: "batch.remove_member", entityType: "batches", entityId: id, metadata: { studentId } }, req);
  });
}

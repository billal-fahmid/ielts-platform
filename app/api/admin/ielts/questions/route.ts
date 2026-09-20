import { NextResponse } from "next/server";
import { requireRole } from "@/lib/security/guards";
import { audit } from "@/lib/security/audit";
import { rateLimit } from "@/lib/security/rate-limit";
import { createQuestion, listParents, listQuestionRows } from "@/lib/services/ielts-admin";

export async function GET() {
  const g = await requireRole("ADMIN", "TEACHER");
  if (!g.ok) return g.response;
  return NextResponse.json({ items: listQuestionRows(), parents: listParents() });
}

export async function POST(req: Request) {
  const g = await requireRole("ADMIN", "TEACHER");
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "admin-write", limit: 120, windowSeconds: 60, key: g.user.id });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const result = createQuestion(body);
  if (!result.ok) return NextResponse.json({ error: result.errors[0], errors: result.errors }, { status: 400 });
  audit({ actorId: g.user.id, actorRole: g.user.role, action: "ielts_question.create", entityType: "ielts_questions", entityId: result.id }, req);
  return NextResponse.json({ id: result.id }, { status: 201 });
}

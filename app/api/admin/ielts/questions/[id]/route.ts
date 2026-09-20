import { NextResponse } from "next/server";
import { requireRole } from "@/lib/security/guards";
import { audit } from "@/lib/security/audit";
import { rateLimit } from "@/lib/security/rate-limit";
import { deleteQuestion, getQuestion, setQuestionPublished, updateQuestion } from "@/lib/services/ielts-admin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const g = await requireRole("ADMIN", "TEACHER");
  if (!g.ok) return g.response;
  const { id } = await params;
  const question = getQuestion(id);
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ question });
}

/** Either a full edit, or `{ published: boolean }` on its own to publish/unpublish. */
export async function PATCH(req: Request, { params }: Ctx) {
  const g = await requireRole("ADMIN", "TEACHER");
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "admin-write", limit: 120, windowSeconds: 60, key: g.user.id });
  if (limited) return limited;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const publishOnly = Object.keys(body).length === 1 && typeof body.published === "boolean";
  const result = publishOnly ? setQuestionPublished(id, body.published) : updateQuestion(id, body);

  if (!result.ok) {
    const notFound = result.errors[0] === "Question not found.";
    return NextResponse.json({ error: result.errors[0], errors: result.errors }, { status: notFound ? 404 : 400 });
  }
  audit({ actorId: g.user.id, actorRole: g.user.role, action: publishOnly ? (body.published ? "ielts_question.publish" : "ielts_question.unpublish") : "ielts_question.update", entityType: "ielts_questions", entityId: id }, req);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const g = await requireRole("ADMIN", "TEACHER");
  if (!g.ok) return g.response;
  const { id } = await params;
  if (!deleteQuestion(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  audit({ actorId: g.user.id, actorRole: g.user.role, action: "ielts_question.delete", entityType: "ielts_questions", entityId: id }, req);
  return NextResponse.json({ ok: true });
}

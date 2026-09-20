import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubmission, saveDraft } from "@/lib/services/writing";
import { MAX_ESSAY_CHARS } from "@/lib/ielts/writing";

export async function PATCH(req: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;

  const { submissionId } = await params;
  const submission = getSubmission(submissionId);
  if (!submission || submission.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (submission.status !== "DRAFT") return NextResponse.json({ error: "Already submitted" }, { status: 409 });

  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content : "";
  if (content.length > MAX_ESSAY_CHARS) return NextResponse.json({ error: "Essay is too long" }, { status: 400 });
  const timeSpentSeconds = Math.max(0, Number(body?.timeSpentSeconds ?? submission.timeSpentSeconds ?? 0)) || 0;

  saveDraft(submissionId, content, timeSpentSeconds);
  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() });
}

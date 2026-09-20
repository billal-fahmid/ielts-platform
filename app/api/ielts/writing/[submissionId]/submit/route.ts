import { denyUnlessFeature } from "@/lib/plans/gate";
import { aiRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { evaluateSubmission, getSubmission, markSubmitted } from "@/lib/services/writing";
import { awardXp } from "@/lib/services/gamification";
import { MAX_ESSAY_CHARS, MIN_SUBMIT_WORDS, countWords } from "@/lib/ielts/writing";

export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;
  const denied = denyUnlessFeature(userId, "AI_WRITING");
  if (denied) return denied;
  const limited = aiRateLimit(req, userId);
  if (limited) return limited;

  const { submissionId } = await params;
  const submission = getSubmission(submissionId);
  if (!submission || submission.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (submission.status !== "DRAFT") return NextResponse.json({ error: "Already submitted" }, { status: 409 });

  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content : submission.content;
  if (content.length > MAX_ESSAY_CHARS) return NextResponse.json({ error: "Essay is too long" }, { status: 400 });
  if (countWords(content) < MIN_SUBMIT_WORDS) {
    return NextResponse.json({ error: `Write at least ${MIN_SUBMIT_WORDS} words before submitting.` }, { status: 400 });
  }
  const timeSpentSeconds = Math.max(0, Number(body?.timeSpentSeconds ?? submission.timeSpentSeconds ?? 0)) || 0;

  markSubmitted(submissionId, content, timeSpentSeconds);
  await awardXp(userId, 25);

  // The essay is saved either way; if AI is unavailable the results page offers a retry.
  const result = await evaluateSubmission(submissionId);
  return NextResponse.json({ submissionId, evaluated: result.ok });
}

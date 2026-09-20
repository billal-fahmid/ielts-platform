import { denyUnlessFeature } from "@/lib/plans/gate";
import { aiRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { evaluateSubmission, getSubmission } from "@/lib/services/writing";

export const maxDuration = 120;

/** Retry AI feedback for an essay that was submitted while AI was unavailable. */
export async function POST(req: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;
  const denied = denyUnlessFeature(userId, "AI_WRITING", "ADVANCED_MOCK");
  if (denied) return denied;
  const limited = aiRateLimit(req, userId);
  if (limited) return limited;

  const { submissionId } = await params;
  const submission = getSubmission(submissionId);
  if (!submission || submission.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (submission.status === "DRAFT") return NextResponse.json({ error: "Submit the essay first" }, { status: 409 });

  const result = await evaluateSubmission(submissionId);
  if (result.ok) return NextResponse.json({ evaluated: true });
  return NextResponse.json({ evaluated: false, message: result.message });
}

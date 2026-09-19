import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAttempt, submitAttempt } from "@/lib/services/reading";
import { awardXp } from "@/lib/services/gamification";

export async function POST(req: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;

  const { attemptId } = await params;
  const attempt = getAttempt(attemptId);
  if (!attempt || attempt.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });

  const body = await req.json().catch(() => null);
  const answers = (body?.answers ?? {}) as Record<string, unknown>;
  const timeSpentSeconds = Number(body?.timeSpentSeconds ?? attempt.timeSpentSeconds ?? 0);

  const result = submitAttempt(attemptId, answers, timeSpentSeconds);

  const xpEarned = result.rawScore * 5;
  const xpResult = await awardXp(userId, xpEarned);

  return NextResponse.json({ ...result, xpEarned, xpResult });
}

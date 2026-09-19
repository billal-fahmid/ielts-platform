import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gradeQuiz, saveQuizAttempt } from "@/lib/services/quiz";
import { awardXp } from "@/lib/services/gamification";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json().catch(() => null);
  const quizId = body?.quizId as string;
  const answers = (body?.answers ?? {}) as Record<string, string>;
  if (!quizId) return NextResponse.json({ error: "quizId is required" }, { status: 400 });

  const result = gradeQuiz(quizId, answers);
  saveQuizAttempt(userId, quizId, result.score, result.total, answers);

  const xpEarned = result.score * 5;
  const xpResult = await awardXp(userId, xpEarned);

  return NextResponse.json({ ...result, xpEarned, xpResult });
}

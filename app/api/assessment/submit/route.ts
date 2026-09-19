import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAssessmentQuiz, getQuestions, saveQuizAttempt, saveAssessmentResult } from "@/lib/services/quiz";
import { awardXp } from "@/lib/services/gamification";
import { updateProfile } from "@/lib/services/users";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json().catch(() => null);
  const answers = (body?.answers ?? {}) as Record<string, string>;

  const quiz = getAssessmentQuiz();
  if (!quiz) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  const questions = getQuestions(quiz.id);

  const byCategory: Record<string, { correct: number; total: number }> = {
    GRAMMAR: { correct: 0, total: 0 },
    VOCABULARY: { correct: 0, total: 0 },
    READING: { correct: 0, total: 0 },
    LISTENING: { correct: 0, total: 0 },
  };

  let overallCorrect = 0;
  questions.forEach((q) => {
    const cat = q.skillCategory ?? "GRAMMAR";
    byCategory[cat].total += 1;
    const isCorrect = (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    if (isCorrect) {
      byCategory[cat].correct += 1;
      overallCorrect += 1;
    }
  });

  const pct = (c: number, t: number) => (t > 0 ? Math.round((c / t) * 100) : 0);
  const scores = {
    grammar: pct(byCategory.GRAMMAR.correct, byCategory.GRAMMAR.total),
    vocabulary: pct(byCategory.VOCABULARY.correct, byCategory.VOCABULARY.total),
    reading: pct(byCategory.READING.correct, byCategory.READING.total),
    listening: pct(byCategory.LISTENING.correct, byCategory.LISTENING.total),
  };

  saveQuizAttempt(userId, quiz.id, overallCorrect, questions.length, answers);
  const result = saveAssessmentResult(userId, scores);

  updateProfile(userId, { englishLevel: result.estimatedLevel as any });

  const xpResult = await awardXp(userId, 50);

  return NextResponse.json({ scores, ...result, xpResult });
}

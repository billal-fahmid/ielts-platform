import { db } from "@/lib/db";
import { readingPassages, ieltsQuestions, ieltsAttempts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { calculateReadingBand } from "@/lib/ielts/band-calculator";
import { isAnswerCorrect } from "@/lib/ielts/question-types";

export function listPublishedPassages() {
  return db.select().from(readingPassages).where(eq(readingPassages.published, true)).all();
}

export function getPassage(passageId: string) {
  return db.select().from(readingPassages).where(eq(readingPassages.id, passageId)).get();
}

export function getQuestionsForPassage(passageId: string) {
  return db
    .select()
    .from(ieltsQuestions)
    .where(and(eq(ieltsQuestions.passageId, passageId), eq(ieltsQuestions.skill, "READING")))
    .all()
    .sort((a, b) => a.order - b.order);
}

/** Resumes the user's in-progress attempt for this passage, or starts a new one. */
export function startOrResumeAttempt(userId: string, passageId: string) {
  const existing = db
    .select()
    .from(ieltsAttempts)
    .where(
      and(
        eq(ieltsAttempts.userId, userId),
        eq(ieltsAttempts.readingPassageId, passageId),
        eq(ieltsAttempts.skill, "READING"),
        eq(ieltsAttempts.status, "IN_PROGRESS")
      )
    )
    .all()
    .sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""))[0];

  if (existing) return existing;

  const attempt = {
    id: newId(),
    userId,
    skill: "READING" as const,
    readingPassageId: passageId,
    status: "IN_PROGRESS" as const,
    answers: {},
    timeSpentSeconds: 0,
  };
  db.insert(ieltsAttempts).values(attempt).run();
  return db.select().from(ieltsAttempts).where(eq(ieltsAttempts.id, attempt.id)).get()!;
}

export function getAttempt(attemptId: string) {
  return db.select().from(ieltsAttempts).where(eq(ieltsAttempts.id, attemptId)).get();
}

export function saveAttemptProgress(attemptId: string, answers: Record<string, unknown>, timeSpentSeconds: number) {
  db.update(ieltsAttempts)
    .set({ answers, timeSpentSeconds })
    .where(eq(ieltsAttempts.id, attemptId))
    .run();
}

export function submitAttempt(attemptId: string, answers: Record<string, unknown>, timeSpentSeconds: number) {
  const attempt = getAttempt(attemptId);
  if (!attempt || !attempt.readingPassageId) throw new Error("Attempt not found");

  const passage = getPassage(attempt.readingPassageId);
  if (!passage) throw new Error("Passage not found");

  const questions = getQuestionsForPassage(attempt.readingPassageId);
  let rawScore = 0;
  const perQuestion = questions.map((q) => {
    const studentAnswer = answers[q.id];
    const isCorrect = isAnswerCorrect(q.questionType, q.correctAnswer, studentAnswer);
    if (isCorrect) rawScore += q.points;
    return {
      questionId: q.id,
      isCorrect,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    };
  });

  const totalQuestions = questions.reduce((sum, q) => sum + q.points, 0);
  const bandScore = calculateReadingBand(rawScore, totalQuestions, passage.testType);

  db.update(ieltsAttempts)
    .set({
      status: "COMPLETED",
      answers,
      rawScore,
      totalQuestions,
      bandScore,
      timeSpentSeconds,
      completedAt: new Date().toISOString(),
    })
    .where(eq(ieltsAttempts.id, attemptId))
    .run();

  return { rawScore, totalQuestions, bandScore, perQuestion };
}

export function recentReadingAttempts(userId: string, limit = 5) {
  return db
    .select()
    .from(ieltsAttempts)
    .where(and(eq(ieltsAttempts.userId, userId), eq(ieltsAttempts.skill, "READING"), eq(ieltsAttempts.status, "COMPLETED")))
    .all()
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
    .slice(0, limit);
}

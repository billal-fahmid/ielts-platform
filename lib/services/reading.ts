import { db } from "@/lib/db";
import { readingPassages, ieltsQuestions, ieltsAttempts } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { calculateReadingBand } from "@/lib/ielts/band-calculator";
import { gradeQuestions } from "@/lib/ielts/question-types";
import { getAttempt } from "@/lib/services/ielts-attempts";

/** Published passages that have at least one published question, so students never open an empty test. */
export function listPublishedPassages() {
  return db
    .select()
    .from(readingPassages)
    .where(eq(readingPassages.published, true))
    .all()
    .filter((p) => getQuestionsForPassage(p.id).length > 0);
}

export function getPassage(passageId: string) {
  return db.select().from(readingPassages).where(eq(readingPassages.id, passageId)).get();
}

export function getQuestionsForPassage(passageId: string) {
  return db
    .select()
    .from(ieltsQuestions)
    .where(and(eq(ieltsQuestions.passageId, passageId), eq(ieltsQuestions.skill, "READING"), eq(ieltsQuestions.published, true)))
    .all()
    .sort((a, b) => a.order - b.order);
}

/**
 * Resumes the user's in-progress attempt for this passage, or starts a new one. Attempts that belong
 * to a mock test are kept separate: pass that mock's id to work with them, omit it for plain practice.
 */
export function startOrResumeAttempt(userId: string, passageId: string, mockAttemptId?: string) {
  const existing = db
    .select()
    .from(ieltsAttempts)
    .where(
      and(
        eq(ieltsAttempts.userId, userId),
        eq(ieltsAttempts.readingPassageId, passageId),
        eq(ieltsAttempts.skill, "READING"),
        eq(ieltsAttempts.status, "IN_PROGRESS"),
        mockAttemptId ? eq(ieltsAttempts.mockAttemptId, mockAttemptId) : isNull(ieltsAttempts.mockAttemptId)
      )
    )
    .all()
    .sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""))[0];

  if (existing) return existing;

  const attemptId = newId();
  db.insert(ieltsAttempts)
    .values({
      id: attemptId,
      userId,
      skill: "READING",
      readingPassageId: passageId,
      status: "IN_PROGRESS",
      answers: {},
      timeSpentSeconds: 0,
      mockAttemptId: mockAttemptId ?? null,
    })
    .run();
  return getAttempt(attemptId)!;
}

export function submitAttempt(attemptId: string, answers: Record<string, unknown>, timeSpentSeconds: number) {
  const attempt = getAttempt(attemptId);
  if (!attempt || !attempt.readingPassageId) throw new Error("Attempt not found");

  const passage = getPassage(attempt.readingPassageId);
  if (!passage) throw new Error("Passage not found");

  const questions = getQuestionsForPassage(attempt.readingPassageId);
  const { rawScore, totalPoints: totalQuestions, perQuestion } = gradeQuestions(questions, answers);
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

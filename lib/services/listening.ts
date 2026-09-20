import { db } from "@/lib/db";
import { listeningTests, listeningSections, ieltsQuestions, ieltsAttempts } from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { calculateListeningBand } from "@/lib/ielts/band-calculator";
import { gradeQuestions } from "@/lib/ielts/question-types";
import { getAttempt } from "@/lib/services/ielts-attempts";

/** Published tests that have at least one published question, so students never open an empty test. */
export function listPublishedTests() {
  return db
    .select()
    .from(listeningTests)
    .where(eq(listeningTests.published, true))
    .all()
    .filter((t) => getQuestionsForTest(t.id).length > 0);
}

export function getTest(testId: string) {
  return db.select().from(listeningTests).where(eq(listeningTests.id, testId)).get();
}

export function getSections(testId: string) {
  return db
    .select()
    .from(listeningSections)
    .where(eq(listeningSections.listeningTestId, testId))
    .all()
    .sort((a, b) => a.sectionNumber - b.sectionNumber);
}

/** All questions for a test, ordered by section then question order. */
export function getQuestionsForTest(testId: string) {
  const sections = getSections(testId);
  if (sections.length === 0) return [];
  const bySection = new Map(sections.map((s) => [s.id, s.sectionNumber]));

  return db
    .select()
    .from(ieltsQuestions)
    .where(
      and(
        eq(ieltsQuestions.skill, "LISTENING"),
        eq(ieltsQuestions.published, true),
        inArray(
          ieltsQuestions.listeningSectionId,
          sections.map((s) => s.id)
        )
      )
    )
    .all()
    .sort(
      (a, b) =>
        (bySection.get(a.listeningSectionId!) ?? 0) - (bySection.get(b.listeningSectionId!) ?? 0) || a.order - b.order
    );
}

/**
 * Resumes the user's in-progress attempt for this test, or starts a new one. Attempts that belong
 * to a mock test are kept separate: pass that mock's id to work with them, omit it for plain practice.
 */
export function startOrResumeAttempt(userId: string, testId: string, mockAttemptId?: string) {
  const existing = db
    .select()
    .from(ieltsAttempts)
    .where(
      and(
        eq(ieltsAttempts.userId, userId),
        eq(ieltsAttempts.listeningTestId, testId),
        eq(ieltsAttempts.skill, "LISTENING"),
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
      skill: "LISTENING",
      listeningTestId: testId,
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
  if (!attempt || !attempt.listeningTestId) throw new Error("Attempt not found");

  const questions = getQuestionsForTest(attempt.listeningTestId);
  const { rawScore, totalPoints: totalQuestions, perQuestion } = gradeQuestions(questions, answers);
  const bandScore = calculateListeningBand(rawScore, totalQuestions);

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

export function recentListeningAttempts(userId: string, limit = 5) {
  return db
    .select()
    .from(ieltsAttempts)
    .where(and(eq(ieltsAttempts.userId, userId), eq(ieltsAttempts.skill, "LISTENING"), eq(ieltsAttempts.status, "COMPLETED")))
    .all()
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
    .slice(0, limit);
}

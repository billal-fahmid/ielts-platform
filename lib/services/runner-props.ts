import type { ieltsAttempts } from "@/lib/db/schema";
import { getTest, getSections, getQuestionsForTest } from "@/lib/services/listening";
import { getPassage, getQuestionsForPassage } from "@/lib/services/reading";

type Attempt = typeof ieltsAttempts.$inferSelect;

/**
 * The data the Listening and Reading runners need, in one place so practice pages and mock tests
 * send identical payloads. Never includes correct answers, explanations or transcripts.
 * `elapsedSeconds` lets a mock test pass wall-clock time instead of the practice attempt's own counter.
 */
export function listeningRunnerProps(attempt: Attempt, elapsedSeconds?: number) {
  const test = getTest(attempt.listeningTestId!)!;
  const sections = getSections(test.id);
  const questions = getQuestionsForTest(test.id);

  return {
    attemptId: attempt.id,
    test: { title: test.title, timeLimitSeconds: test.timeLimitSeconds },
    sections: sections.map((s) => ({ id: s.id, sectionNumber: s.sectionNumber, audioUrl: s.audioUrl, context: s.context })),
    questions: questions.map((q) => ({
      id: q.id,
      sectionId: q.listeningSectionId!,
      questionType: q.questionType,
      prompt: q.prompt,
      content: q.content as Record<string, unknown>,
      order: q.order,
      points: q.points,
    })),
    initialAnswers: (attempt.answers as Record<string, unknown>) ?? {},
    initialTimeSpentSeconds: elapsedSeconds ?? attempt.timeSpentSeconds,
  };
}

export function readingRunnerProps(attempt: Attempt, elapsedSeconds?: number) {
  const passage = getPassage(attempt.readingPassageId!)!;
  const questions = getQuestionsForPassage(passage.id);

  return {
    attemptId: attempt.id,
    passage: { title: passage.title, testType: passage.testType, timeLimitSeconds: passage.timeLimitSeconds, bodyText: passage.bodyText },
    questions: questions.map((q) => ({
      id: q.id,
      questionType: q.questionType,
      prompt: q.prompt,
      content: q.content as Record<string, unknown>,
      order: q.order,
      points: q.points,
    })),
    initialAnswers: (attempt.answers as Record<string, unknown>) ?? {},
    initialTimeSpentSeconds: elapsedSeconds ?? attempt.timeSpentSeconds,
  };
}

import { db } from "@/lib/db";
import { quizzes, questions, quizAttempts, assessmentResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { estimateLevel } from "@/lib/utils";

export function getQuiz(quizId: string) {
  return db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
}

export function getQuizByLesson(lessonId: string) {
  return db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).get();
}

export function getQuizByGrammarTopic(topicId: string) {
  return db.select().from(quizzes).where(eq(quizzes.grammarTopicId, topicId)).get();
}

export function getAssessmentQuiz() {
  return db.select().from(quizzes).where(eq(quizzes.type, "ASSESSMENT")).get();
}

export function getQuestions(quizId: string) {
  return db.select().from(questions).where(eq(questions.quizId, quizId)).all().sort((a, b) => a.order - b.order);
}

export function gradeQuiz(quizId: string, answers: Record<string, string>) {
  const qs = getQuestions(quizId);
  let correct = 0;
  const perQuestion = qs.map((q) => {
    const isCorrect = (answers[q.id] || "").trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    if (isCorrect) correct += 1;
    return { questionId: q.id, isCorrect, correctAnswer: q.correctAnswer, explanation: q.explanation };
  });
  return { score: correct, total: qs.length, perQuestion };
}

export function saveQuizAttempt(userId: string, quizId: string, score: number, total: number, answers: Record<string, string>) {
  db.insert(quizAttempts)
    .values({ id: newId(), userId, quizId, score, totalQuestions: total, answers })
    .run();
}

export function recentAttempts(userId: string, limit = 5) {
  return db
    .select()
    .from(quizAttempts)
    .where(eq(quizAttempts.userId, userId))
    .all()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, limit);
}

export function saveAssessmentResult(
  userId: string,
  scores: { grammar: number; vocabulary: number; reading: number; listening: number }
) {
  const overall = (scores.grammar + scores.vocabulary + scores.reading + scores.listening) / 4;
  const estimatedLevel = estimateLevel(overall);
  const weakAreas = Object.entries(scores)
    .filter(([, v]) => v < 60)
    .map(([k]) => k);

  db.insert(assessmentResults)
    .values({
      id: newId(),
      userId,
      overallScore: overall,
      grammarScore: scores.grammar,
      vocabularyScore: scores.vocabulary,
      readingScore: scores.reading,
      listeningScore: scores.listening,
      estimatedLevel,
      weakAreas,
    })
    .run();

  return { overall, estimatedLevel, weakAreas };
}

export function latestAssessmentResult(userId: string) {
  return db
    .select()
    .from(assessmentResults)
    .where(eq(assessmentResults.userId, userId))
    .all()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
}

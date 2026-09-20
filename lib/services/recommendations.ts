import { db } from "@/lib/db";
import {
  ieltsAttempts,
  learningRecommendations,
  mockTestAttempts,
  speakingEvaluations,
  speakingSessions,
  userVocabulary,
  writingEvaluations,
  writingSubmissions,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { getProfile } from "@/lib/services/users";
import { latestAssessmentResult } from "@/lib/services/quiz";
import { getEstimatedBands, examCountdownDays } from "@/lib/services/ielts-dashboard";
import * as listening from "@/lib/services/listening";
import * as reading from "@/lib/services/reading";
import { gradeQuestions } from "@/lib/ielts/question-types";
import { QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/ielts/question-validation";
import { MIN_WORDS } from "@/lib/ielts/writing";
import { buildRecommendations, type Analysis, type Recommendation } from "@/lib/ielts/recommendation-rules";

/** Only this many recent evaluations / attempts shape the analysis, so it follows the student's progress. */
const RECENT = 3;
const RECENT_ATTEMPTS_FOR_TYPES = 8;
const WEAK_ACCURACY = 0.6;
const MIN_ANSWERED_PER_TYPE = 3;

const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
const time = (value: string | null | undefined) => (value ? new Date(/[TZ]/.test(value) ? value : value.replace(" ", "T") + "Z").getTime() : 0);
const daysSince = (value: string | null | undefined) => (value ? Math.max(0, Math.floor((Date.now() - time(value)) / 86400000)) : null);

function weakQuestionTypes(userId: string): Analysis["weakQuestionTypes"] {
  const tally = new Map<string, { skill: "listening" | "reading"; type: string; correct: number; total: number }>();

  const attempts = db
    .select()
    .from(ieltsAttempts)
    .where(and(eq(ieltsAttempts.userId, userId), eq(ieltsAttempts.status, "COMPLETED")))
    .all();

  for (const skill of ["LISTENING", "READING"] as const) {
    const recent = attempts
      .filter((a) => a.skill === skill)
      .sort((x, y) => (y.completedAt || "").localeCompare(x.completedAt || ""))
      .slice(0, RECENT_ATTEMPTS_FOR_TYPES);

    for (const attempt of recent) {
      const questions =
        skill === "LISTENING"
          ? attempt.listeningTestId
            ? listening.getQuestionsForTest(attempt.listeningTestId)
            : []
          : attempt.readingPassageId
            ? reading.getQuestionsForPassage(attempt.readingPassageId)
            : [];
      const { perQuestion } = gradeQuestions(questions, (attempt.answers as Record<string, unknown>) ?? {});
      const typeById = new Map(questions.map((q) => [q.id, q.questionType]));
      for (const r of perQuestion) {
        const type = typeById.get(r.questionId)!;
        const key = `${skill}:${type}`;
        const entry = tally.get(key) ?? { skill: skill === "LISTENING" ? "listening" : "reading", type, correct: 0, total: 0 };
        entry.total++;
        if (r.isCorrect) entry.correct++;
        tally.set(key, entry);
      }
    }
  }

  return [...tally.values()]
    .filter((t) => t.total >= MIN_ANSWERED_PER_TYPE && t.correct / t.total < WEAK_ACCURACY)
    .map((t) => ({ ...t, label: QUESTION_TYPE_LABELS[t.type as QuestionType] ?? t.type }));
}

function writingAnalysis(userId: string): { count: number; data: Analysis["writing"] } {
  const submissions = db.select().from(writingSubmissions).where(eq(writingSubmissions.userId, userId)).all();
  const byId = new Map(submissions.map((s) => [s.id, s]));
  const evaluations = db
    .select()
    .from(writingEvaluations)
    .all()
    .filter((e) => byId.has(e.submissionId))
    .sort((x, y) => (y.createdAt || "").localeCompare(x.createdAt || ""));
  if (evaluations.length === 0) return { count: 0, data: null };

  const recent = evaluations.slice(0, RECENT);
  const latest = byId.get(evaluations[0].submissionId)!;
  const min = MIN_WORDS[latest.taskType];
  return {
    count: evaluations.length,
    data: {
      count: evaluations.length,
      criteria: {
        task: avg(recent.map((e) => e.taskResponse)),
        coherence: avg(recent.map((e) => e.fluencyCoherence)),
        lexical: avg(recent.map((e) => e.lexicalResource)),
        grammar: avg(recent.map((e) => e.grammarAccuracy)),
      },
      shortfall: latest.wordCount < min ? { task: latest.taskType, words: latest.wordCount, min } : null,
    },
  };
}

function speakingAnalysis(userId: string): { count: number; data: Analysis["speaking"] } {
  const sessions = new Set(db.select().from(speakingSessions).where(eq(speakingSessions.userId, userId)).all().map((s) => s.id));
  const evaluations = db
    .select()
    .from(speakingEvaluations)
    .all()
    .filter((e) => sessions.has(e.sessionId))
    .sort((x, y) => (y.createdAt || "").localeCompare(x.createdAt || ""));
  if (evaluations.length === 0) return { count: 0, data: null };

  const recent = evaluations.slice(0, RECENT);
  return {
    count: evaluations.length,
    data: {
      count: evaluations.length,
      criteria: {
        fluency: avg(recent.map((e) => e.fluencyCoherence)),
        lexical: avg(recent.map((e) => e.lexicalResource)),
        grammar: avg(recent.map((e) => e.grammarAccuracy)),
        pronunciation: avg(recent.map((e) => e.pronunciationEstimate)),
      },
    },
  };
}

/** Gathers everything the rules need. Read-only. */
export function gatherAnalysis(userId: string): Analysis {
  const profile = getProfile(userId);
  const bands = getEstimatedBands(userId);
  const assessment = latestAssessmentResult(userId);

  const completed = db
    .select()
    .from(ieltsAttempts)
    .where(and(eq(ieltsAttempts.userId, userId), eq(ieltsAttempts.status, "COMPLETED")))
    .all();
  const writing = writingAnalysis(userId);
  const speaking = speakingAnalysis(userId);

  const vocab = db.select().from(userVocabulary).where(eq(userVocabulary.userId, userId)).all();
  const mocks = db
    .select()
    .from(mockTestAttempts)
    .where(and(eq(mockTestAttempts.userId, userId), eq(mockTestAttempts.status, "COMPLETED")))
    .all()
    .sort((x, y) => (y.completedAt || "").localeCompare(x.completedAt || ""));

  return {
    target: profile?.ieltsTarget ?? null,
    level: profile?.englishLevel ?? null,
    bands: { listening: bands.listening, reading: bands.reading, writing: bands.writing, speaking: bands.speaking },
    attempts: {
      listening: completed.filter((a) => a.skill === "LISTENING").length,
      reading: completed.filter((a) => a.skill === "READING").length,
      writing: writing.count,
      speaking: speaking.count,
    },
    weakQuestionTypes: weakQuestionTypes(userId),
    writing: writing.data,
    speaking: speaking.data,
    assessment: assessment
      ? { grammar: assessment.grammarScore, vocabulary: assessment.vocabularyScore, weakAreas: (assessment.weakAreas as string[]) ?? [] }
      : null,
    vocab: {
      learned: vocab.filter((v) => v.status === "LEARNED").length,
      difficult: vocab.filter((v) => v.status === "DIFFICULT").length,
    },
    mocks: { count: mocks.length, daysSinceLast: daysSince(mocks[0]?.completedAt) },
    daysToExam: examCountdownDays(profile?.targetExamDate),
    daysSinceStudy: profile?.lastStudyDate ? Math.max(0, Math.round((Date.parse(new Date().toISOString().slice(0, 10)) - Date.parse(profile.lastStudyDate)) / 86400000)) : null,
    dailyGoalMinutes: profile?.dailyGoalMinutes ?? 20,
  };
}

export function listActiveRecommendations(userId: string, limit = 6) {
  return db
    .select()
    .from(learningRecommendations)
    .where(and(eq(learningRecommendations.userId, userId), eq(learningRecommendations.status, "ACTIVE")))
    .all()
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

/**
 * Recomputes the student's suggestions from their latest results and stores them. A suggestion the
 * student dismissed stays dismissed while the same rule keeps applying; a rule that no longer applies
 * (the problem was fixed) drops its suggestion.
 */
export function refreshRecommendations(userId: string, analysis: Analysis = gatherAnalysis(userId), limit = 6) {
  const fresh = buildRecommendations(analysis);
  const existing = db.select().from(learningRecommendations).where(eq(learningRecommendations.userId, userId)).all();
  const bySource = new Map(existing.map((r) => [r.source ?? "", r]));
  const freshSources = new Set(fresh.map((r) => r.source));

  for (const row of existing) {
    if (!freshSources.has(row.source ?? "")) db.delete(learningRecommendations).where(eq(learningRecommendations.id, row.id)).run();
  }
  for (const r of fresh) {
    const current = bySource.get(r.source);
    if (current) {
      db.update(learningRecommendations)
        .set({ category: r.category, title: r.title, description: r.description, actionUrl: r.actionUrl, priority: Math.round(r.priority) })
        .where(eq(learningRecommendations.id, current.id))
        .run();
    } else {
      insertRecommendation(userId, r);
    }
  }
  return listActiveRecommendations(userId, limit);
}

function insertRecommendation(userId: string, r: Recommendation) {
  db.insert(learningRecommendations)
    .values({
      id: newId(),
      userId,
      category: r.category,
      title: r.title,
      description: r.description,
      actionUrl: r.actionUrl,
      priority: Math.round(r.priority),
      status: "ACTIVE",
      source: r.source,
    })
    .run();
}

/** Hides a suggestion. Returns false if it doesn't belong to this student. */
export function dismissRecommendation(userId: string, recommendationId: string): boolean {
  const row = db.select().from(learningRecommendations).where(eq(learningRecommendations.id, recommendationId)).get();
  if (!row || row.userId !== userId) return false;
  db.update(learningRecommendations).set({ status: "DISMISSED" }).where(eq(learningRecommendations.id, recommendationId)).run();
  return true;
}

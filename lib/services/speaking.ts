import { db } from "@/lib/db";
import { speakingPrompts, speakingSessions, speakingTurns, speakingEvaluations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { computeTurnMetrics, summariseSession, type AudioMetrics } from "@/lib/ielts/speaking-metrics";
import { evaluateSpeaking, type SpeakingEvaluation } from "@/lib/ai/speaking-evaluation";
import { getAIProvider } from "@/lib/ai/provider";
import type { AIProvider, AIResult } from "@/lib/ai/types";

export type SessionMode = "FULL_TEST" | "PART1_PRACTICE" | "PART2_PRACTICE" | "PART3_PRACTICE";
export type Part = "PART1" | "PART2" | "PART3";

/** URL segment -> stored mode. */
export const URL_MODES: Record<string, SessionMode> = {
  full: "FULL_TEST",
  part1: "PART1_PRACTICE",
  part2: "PART2_PRACTICE",
  part3: "PART3_PRACTICE",
};

export type SessionContent = {
  part1: { id: string; text: string }[];
  cueCard: { id: string; topic: string; text: string } | null;
  part3: { id: string; text: string }[];
};

function shuffle<T>(items: T[]): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function publishedPrompts(part: Part) {
  return db
    .select()
    .from(speakingPrompts)
    .where(eq(speakingPrompts.part, part))
    .all()
    .filter((p) => p.published);
}

function groupByTopic<T extends { topic: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(item.topic, [...(groups.get(item.topic) ?? []), item]);
  return [...groups.entries()];
}

/** Picks the questions for a session: examiner-style Part 1 topics, a cue card, and linked Part 3 questions. */
export function pickContent(mode: SessionMode): SessionContent {
  const content: SessionContent = { part1: [], cueCard: null, part3: [] };

  if (mode === "FULL_TEST" || mode === "PART1_PRACTICE") {
    const topics = shuffle(groupByTopic(publishedPrompts("PART1")));
    const take = mode === "FULL_TEST" ? { topics: 2, perTopic: 3 } : { topics: 1, perTopic: 5 };
    content.part1 = topics
      .slice(0, take.topics)
      .flatMap(([, qs]) => qs.slice(0, take.perTopic))
      .map((q) => ({ id: q.id, text: q.questionText }));
  }

  const cards = shuffle(publishedPrompts("PART2"));
  const card = cards[0];
  if (card && (mode === "FULL_TEST" || mode === "PART2_PRACTICE")) {
    content.cueCard = { id: card.id, topic: card.topic, text: card.questionText };
  }

  if (mode === "FULL_TEST" || mode === "PART3_PRACTICE") {
    const linked = card ? publishedPrompts("PART3").filter((p) => p.followUpOfTopic === card.topic) : [];
    const pool = linked.length > 0 ? linked : shuffle(publishedPrompts("PART3"));
    content.part3 = pool.slice(0, 4).map((q) => ({ id: q.id, text: q.questionText }));
  }

  return content;
}

export function createSession(userId: string, mode: SessionMode, topic: string | null) {
  const sessionId = newId();
  db.insert(speakingSessions).values({ id: sessionId, userId, mode, topic, status: "IN_PROGRESS" }).run();
  return getSession(sessionId)!;
}

export function getSession(sessionId: string) {
  return db.select().from(speakingSessions).where(eq(speakingSessions.id, sessionId)).get();
}

export function getTurns(sessionId: string) {
  return db
    .select()
    .from(speakingTurns)
    .where(eq(speakingTurns.sessionId, sessionId))
    .all()
    .sort((a, b) => a.order - b.order);
}

export function getEvaluation(sessionId: string) {
  return db.select().from(speakingEvaluations).where(eq(speakingEvaluations.sessionId, sessionId)).get();
}

export function listUserSessions(userId: string, limit = 8) {
  return db
    .select()
    .from(speakingSessions)
    .where(eq(speakingSessions.userId, userId))
    .all()
    .filter((s) => s.status === "COMPLETED")
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""))
    .slice(0, limit);
}

export const MAX_TURNS_PER_SESSION = 30;
export const MAX_TRANSCRIPT_CHARS = 6000;

export function saveTurn(
  sessionId: string,
  turn: {
    part: Part;
    promptId: string | null;
    questionText: string;
    transcript: string;
    durationSeconds: number;
    pauseCount: number;
    totalPauseMs: number;
    typed: boolean;
  }
) {
  const order = getTurns(sessionId).length;
  const audioMetrics: AudioMetrics = computeTurnMetrics(turn);
  db.insert(speakingTurns)
    .values({
      id: newId(),
      sessionId,
      part: turn.part,
      promptId: turn.promptId,
      questionText: turn.questionText,
      transcript: turn.transcript,
      audioMetrics,
      order,
    })
    .run();
}

export function completeSession(sessionId: string, totalDurationSeconds: number) {
  db.update(speakingSessions)
    .set({ status: "COMPLETED", totalDurationSeconds, completedAt: new Date().toISOString() })
    .where(eq(speakingSessions.id, sessionId))
    .run();
}

function saveEvaluation(sessionId: string, e: SpeakingEvaluation, model: string) {
  const summary = summariseSession(getTurns(sessionId).map((t) => ({ transcript: t.transcript, audioMetrics: t.audioMetrics ?? null })));
  db.insert(speakingEvaluations)
    .values({
      id: newId(),
      sessionId,
      estimatedBand: e.estimated_band,
      fluencyCoherence: e.fluency_coherence,
      lexicalResource: e.lexical_resource,
      grammarAccuracy: e.grammar,
      pronunciationEstimate: e.pronunciation_estimate,
      bandRangeLow: e.band_range.low,
      bandRangeHigh: e.band_range.high,
      coherenceFeedback: e.coherence_feedback,
      pronunciationNotes: e.pronunciation_notes,
      strengths: e.strengths,
      weaknesses: e.weaknesses,
      suggestions: e.suggestions,
      // Counts are measured by our own code, not reported by the AI.
      fillerWordCount: summary.fillerCount,
      repeatedWordCount: summary.immediateRepeats,
      isEstimate: true,
      modelUsed: model,
      rawAiResponse: JSON.stringify(e),
    })
    .run();
}

const inFlight = new Set<string>();

/**
 * Runs the AI evaluation for a completed session and stores it. Safe to call again after a
 * failure: it does nothing if an evaluation exists or one is already running for this session.
 */
export async function evaluateSession(
  sessionId: string,
  provider: AIProvider = getAIProvider()
): Promise<AIResult<SpeakingEvaluation>> {
  const session = getSession(sessionId);
  if (!session) return { ok: false, reason: "error", message: "Session not found." };
  if (session.status !== "COMPLETED") return { ok: false, reason: "error", message: "Finish the session first." };

  const existing = getEvaluation(sessionId);
  if (existing) return { ok: true, data: JSON.parse(existing.rawAiResponse ?? "{}") as SpeakingEvaluation };

  if (inFlight.has(sessionId)) return { ok: false, reason: "error", message: "Feedback is already being generated." };
  inFlight.add(sessionId);
  try {
    const turns = getTurns(sessionId).map((t) => ({
      part: t.part,
      questionText: t.questionText,
      transcript: t.transcript,
      metrics: t.audioMetrics ?? null,
    }));
    const result = await evaluateSpeaking({ turns }, provider);
    if (result.ok) saveEvaluation(sessionId, result.data, provider.model ?? provider.name);
    return result;
  } finally {
    inFlight.delete(sessionId);
  }
}

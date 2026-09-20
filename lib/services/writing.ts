import { db } from "@/lib/db";
import { writingPrompts, writingSubmissions, writingEvaluations } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { countWords } from "@/lib/ielts/writing";
import { evaluateWriting, type WritingEvaluation } from "@/lib/ai/writing-evaluation";
import { getAIProvider } from "@/lib/ai/provider";
import type { AIProvider, AIResult } from "@/lib/ai/types";

export function listPublishedPrompts() {
  return db.select().from(writingPrompts).where(eq(writingPrompts.published, true)).all();
}

export function getPrompt(promptId: string) {
  return db.select().from(writingPrompts).where(eq(writingPrompts.id, promptId)).get();
}

export function getSubmission(submissionId: string) {
  return db.select().from(writingSubmissions).where(eq(writingSubmissions.id, submissionId)).get();
}

export function getEvaluation(submissionId: string) {
  return db.select().from(writingEvaluations).where(eq(writingEvaluations.submissionId, submissionId)).get();
}

export function listUserSubmissions(userId: string, limit = 10) {
  return db
    .select()
    .from(writingSubmissions)
    .where(eq(writingSubmissions.userId, userId))
    .all()
    .filter((s) => s.status !== "DRAFT")
    .sort((a, b) => (b.submittedAt || "").localeCompare(a.submittedAt || ""))
    .slice(0, limit);
}

/**
 * Resumes the user's draft for this prompt, or starts a new one. Drafts that belong to a mock test
 * are kept separate: pass that mock's id to work with them, omit it for plain practice.
 */
export function startOrResumeDraft(userId: string, promptId: string, mockAttemptId?: string) {
  const existing = db
    .select()
    .from(writingSubmissions)
    .where(
      and(
        eq(writingSubmissions.userId, userId),
        eq(writingSubmissions.promptId, promptId),
        eq(writingSubmissions.status, "DRAFT"),
        mockAttemptId ? eq(writingSubmissions.mockAttemptId, mockAttemptId) : isNull(writingSubmissions.mockAttemptId)
      )
    )
    .all()
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))[0];
  if (existing) return existing;

  const prompt = getPrompt(promptId);
  if (!prompt) throw new Error("Prompt not found");

  const submissionId = newId();
  db.insert(writingSubmissions)
    .values({
      id: submissionId,
      userId,
      promptId,
      promptTextSnapshot: prompt.promptText,
      taskType: prompt.taskType,
      content: "",
      wordCount: 0,
      status: "DRAFT",
      mockAttemptId: mockAttemptId ?? null,
    })
    .run();
  return getSubmission(submissionId)!;
}

export function saveDraft(submissionId: string, content: string, timeSpentSeconds: number) {
  db.update(writingSubmissions)
    .set({
      content,
      wordCount: countWords(content),
      timeSpentSeconds,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(writingSubmissions.id, submissionId))
    .run();
}

export function markSubmitted(submissionId: string, content: string, timeSpentSeconds: number) {
  const now = new Date().toISOString();
  db.update(writingSubmissions)
    .set({
      content,
      wordCount: countWords(content),
      timeSpentSeconds,
      status: "SUBMITTED",
      updatedAt: now,
      submittedAt: now,
    })
    .where(eq(writingSubmissions.id, submissionId))
    .run();
}

function saveEvaluation(submissionId: string, e: WritingEvaluation, model: string) {
  db.insert(writingEvaluations)
    .values({
      id: newId(),
      submissionId,
      estimatedBand: e.estimated_band,
      fluencyCoherence: e.fluency_coherence,
      lexicalResource: e.lexical_resource,
      grammarAccuracy: e.grammar,
      taskResponse: e.task_response,
      strengths: e.strengths,
      weaknesses: e.weaknesses,
      grammarCorrections: e.grammar_corrections,
      vocabularySuggestions: e.vocabulary_suggestions,
      improvementPlan: e.improvement_plan,
      bandRangeLow: e.band_range.low,
      bandRangeHigh: e.band_range.high,
      coherenceFeedback: e.coherence_feedback,
      structureFeedback: e.structure_feedback,
      modelUsed: model,
      rawAiResponse: JSON.stringify(e),
    })
    .run();
  db.update(writingSubmissions).set({ status: "EVALUATED" }).where(eq(writingSubmissions.id, submissionId)).run();
}

const inFlight = new Set<string>();

/**
 * Runs the AI evaluation for a submitted essay and stores the result. Safe to call again after a
 * failure: it does nothing if an evaluation exists or one is already running for this submission.
 */
export async function evaluateSubmission(
  submissionId: string,
  provider: AIProvider = getAIProvider()
): Promise<AIResult<WritingEvaluation>> {
  const submission = getSubmission(submissionId);
  if (!submission) return { ok: false, reason: "error", message: "Submission not found." };
  if (submission.status === "DRAFT") return { ok: false, reason: "error", message: "Submit the essay before requesting feedback." };

  const existing = getEvaluation(submissionId);
  if (existing) return { ok: true, data: JSON.parse(existing.rawAiResponse ?? "{}") as WritingEvaluation };

  if (inFlight.has(submissionId)) return { ok: false, reason: "error", message: "Feedback is already being generated." };
  inFlight.add(submissionId);
  try {
    const prompt = submission.promptId ? getPrompt(submission.promptId) : undefined;
    const result = await evaluateWriting(
      {
        taskType: submission.taskType,
        category: prompt?.category,
        promptText: submission.promptTextSnapshot,
        visualDescription: prompt?.visualDescription,
        essay: submission.content,
      },
      provider
    );
    if (result.ok) saveEvaluation(submissionId, result.data, provider.model ?? provider.name);
    return result;
  } finally {
    inFlight.delete(submissionId);
  }
}

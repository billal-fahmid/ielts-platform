import type { AIResult } from "./types";

export type WritingEvaluation = {
  estimated_band: number;
  fluency_coherence: number;
  lexical_resource: number;
  grammar: number;
  task_response: number;
  strengths: string[];
  weaknesses: string[];
  grammar_corrections: { original: string; corrected: string; explanation: string }[];
  vocabulary_suggestions: string[];
  improvement_plan: string[];
};

// TODO: Phase 4 — implement using getAIProvider().completeJson() with a Zod schema matching
// WritingEvaluation, a system prompt that scores against IELTS Writing band descriptors, and an
// explicit instruction that the result is an AI estimate, not an official IELTS score.
export async function evaluateWriting(_params: {
  taskType: "TASK1" | "TASK2";
  promptText: string;
  essay: string;
}): Promise<AIResult<WritingEvaluation>> {
  return { ok: false, reason: "unavailable", message: "Writing evaluation is not implemented yet" };
}

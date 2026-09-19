import type { AIResult } from "./types";

export type SpeakingEvaluation = {
  estimated_band: number;
  fluency_coherence: number;
  lexical_resource: number;
  grammar: number;
  pronunciation_estimate: number;
  strengths: string[];
  weaknesses: string[];
  filler_word_count: number;
  repeated_word_count: number;
  suggestions: string[];
};

// TODO: Phase 5 — implement using getAIProvider().completeJson() over the session's transcript +
// client-computed audio metrics (WPM, pauses, filler/repeated words). Pronunciation is inferred
// from transcript disfluencies only (no real audio analysis) — must stay labeled as an estimate.
export async function evaluateSpeaking(_params: {
  turns: { part: "PART1" | "PART2" | "PART3"; questionText: string; transcript: string }[];
}): Promise<AIResult<SpeakingEvaluation>> {
  return { ok: false, reason: "unavailable", message: "Speaking evaluation is not implemented yet" };
}

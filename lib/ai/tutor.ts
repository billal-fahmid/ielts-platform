import type { AIResult } from "./types";

// TODO: Phase 6 — implement using getAIProvider().complete() over the conversation's message
// history, a system prompt that adapts to profile.englishLevel and the requested language
// (English / Bangla / mixed), and persistence via lib/services/ai-tutor.ts.
export async function sendTutorMessage(_params: {
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  englishLevel?: string | null;
  language?: "EN" | "BN" | "MIXED";
}): Promise<AIResult<{ reply: string }>> {
  return { ok: false, reason: "unavailable", message: "AI Tutor is not implemented yet" };
}

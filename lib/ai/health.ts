import { getAIProvider } from "./provider";
import { AIUnavailableError, AIRequestError } from "./types";

export type AIHealth = { available: boolean; ok: boolean; provider: string; error?: string };

/** Minimal round-trip used to verify AI wiring end-to-end and to power an "AI status" indicator. */
export async function checkAIConnection(): Promise<AIHealth> {
  const provider = getAIProvider();

  if (!provider.isConfigured()) {
    return { available: false, ok: false, provider: provider.name };
  }

  try {
    const res = await provider.complete({
      messages: [{ role: "user", content: "Reply with exactly: OK" }],
      maxTokens: 64,
    });
    return { available: true, ok: res.text.trim().length > 0, provider: provider.name };
  } catch (err) {
    if (err instanceof AIUnavailableError) {
      return { available: false, ok: false, provider: provider.name };
    }
    const message = err instanceof AIRequestError ? err.message : "Unknown AI error";
    return { available: true, ok: false, provider: provider.name, error: message };
  }
}

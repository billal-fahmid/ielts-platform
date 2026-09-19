import type { AIProvider } from "./types";
import { AnthropicProvider } from "./providers/anthropic";

let instance: AIProvider | null = null;

/** Adapter swap point: a future provider just needs to implement AIProvider and be selected here. */
export function getAIProvider(): AIProvider {
  if (!instance) instance = new AnthropicProvider();
  return instance;
}

export function isAIAvailable(): boolean {
  return getAIProvider().isConfigured();
}

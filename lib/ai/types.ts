import type { z } from "zod";

export type AIMessage = { role: "user" | "assistant"; content: string };

export type AICompleteRequest = {
  system?: string;
  messages: AIMessage[];
  maxTokens?: number;
};

export type AICompleteJsonRequest<T> = AICompleteRequest & {
  schema: z.ZodType<T>;
};

export interface AIProvider {
  readonly name: string;
  isConfigured(): boolean;
  complete(req: AICompleteRequest): Promise<{ text: string }>;
  completeJson<T>(req: AICompleteJsonRequest<T>): Promise<T>;
}

/** Thrown when no provider is configured (e.g. missing API key). Callers should treat this as an expected, handled state. */
export class AIUnavailableError extends Error {
  constructor(message = "AI features are not configured") {
    super(message);
    this.name = "AIUnavailableError";
  }
}

/** Thrown when a configured provider fails to produce a usable response (network, API error, unparsable output). */
export class AIRequestError extends Error {
  constructor(message = "AI request failed") {
    super(message);
    this.name = "AIRequestError";
  }
}

/** Result wrapper used by composed services (WritingEvaluationService etc.) so routes never need to catch AI errors directly. */
export type AIResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unavailable" | "error"; message: string };

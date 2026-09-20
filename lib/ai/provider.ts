import type { AIProvider } from "./types";
import { AnthropicProvider } from "./providers/anthropic";
import { MockProvider } from "./providers/mock";
import { OpenAICompatibleProvider, type CompatPreset } from "./providers/openai-compatible";

/**
 * Which AI service powers writing/speaking feedback and the tutor is chosen with AI_PROVIDER in
 * .env.local. Everything else in the app talks to the AIProvider interface only.
 *
 *   gemini      Google Gemini (free tier)      GEMINI_API_KEY
 *   groq        Groq (free tier)               GROQ_API_KEY
 *   openrouter  OpenRouter (":free" models)    OPENROUTER_API_KEY
 *   ollama      Ollama running on this PC      OLLAMA_BASE_URL (optional)
 *   custom      Any OpenAI-compatible service  AI_BASE_URL, AI_MODEL, AI_API_KEY (optional)
 *   anthropic   Claude (paid; the default)     ANTHROPIC_API_KEY
 *   mock        Placeholder text, development only
 *
 * AI_MODEL overrides the model for every provider except anthropic (which uses ANTHROPIC_MODEL).
 */
const COMPATIBLE_PRESETS: Record<string, CompatPreset> = {
  gemini: {
    name: "gemini",
    baseUrl: () => "https://generativelanguage.googleapis.com/v1beta/openai",
    apiKey: () => process.env.GEMINI_API_KEY,
    requiresKey: true,
    // A rolling alias, so it keeps working as Google retires specific versions (a pinned name such as
    // gemini-2.5-flash stopped being offered to new accounts).
    defaultModel: "gemini-flash-latest",
    // The lite model has its own capacity, so it usually still answers when the main one returns 503.
    fallbackModels: ["gemini-flash-lite-latest"],
    // Gemini models spend part of the token budget on hidden reasoning.
    tokenHeadroom: 2,
  },
  groq: {
    name: "groq",
    baseUrl: () => "https://api.groq.com/openai/v1",
    apiKey: () => process.env.GROQ_API_KEY,
    requiresKey: true,
    defaultModel: "llama-3.3-70b-versatile",
  },
  openrouter: {
    name: "openrouter",
    baseUrl: () => "https://openrouter.ai/api/v1",
    apiKey: () => process.env.OPENROUTER_API_KEY,
    requiresKey: true,
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
  },
  ollama: {
    name: "ollama",
    baseUrl: () => process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
    apiKey: () => undefined,
    requiresKey: false,
    defaultModel: "llama3.1",
  },
  custom: {
    name: "custom",
    baseUrl: () => process.env.AI_BASE_URL,
    apiKey: () => process.env.AI_API_KEY,
    requiresKey: false,
    defaultModel: "",
    isConfigured: () => !!process.env.AI_BASE_URL && !!process.env.AI_MODEL,
  },
};

const instances = new Map<string, AIProvider>();
const warned = new Set<string>();

function selectedName(): string {
  const requested = (process.env.AI_PROVIDER || "anthropic").trim().toLowerCase();
  if (requested === "anthropic" || requested in COMPATIBLE_PRESETS) return requested;
  // The mock provider is a development aid only: it can never be selected in production.
  if (requested === "mock" && process.env.NODE_ENV !== "production") return "mock";
  if (!warned.has(requested)) {
    warned.add(requested);
    console.warn(`[ai] Unknown AI_PROVIDER "${requested}". Use one of: anthropic, ${Object.keys(COMPATIBLE_PRESETS).join(", ")}. Falling back to anthropic.`);
  }
  return "anthropic";
}

/** Adapter swap point: a new provider only needs to implement AIProvider and be selected here. */
export function getAIProvider(): AIProvider {
  const name = selectedName();
  let provider = instances.get(name);
  if (!provider) {
    provider =
      name === "mock" ? new MockProvider() : name === "anthropic" ? new AnthropicProvider() : new OpenAICompatibleProvider(COMPATIBLE_PRESETS[name]);
    instances.set(name, provider);
  }
  return provider;
}

export function isAIAvailable(): boolean {
  return getAIProvider().isConfigured();
}

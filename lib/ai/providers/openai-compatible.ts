import { z } from "zod";
import type { AIProvider, AICompleteRequest, AICompleteJsonRequest } from "../types";
import { AIRequestError, AIUnavailableError } from "../types";

/**
 * One adapter for every service that speaks the OpenAI "chat completions" protocol: Google Gemini,
 * Groq, OpenRouter, Ollama, LM Studio and others. Which one is used is decided by a preset
 * (see provider.ts). It uses plain fetch, so there is no extra dependency.
 */
export type CompatPreset = {
  name: string;
  /** Read lazily so changes to .env.local apply without a restart. */
  baseUrl: () => string | undefined;
  apiKey: () => string | undefined;
  requiresKey: boolean;
  defaultModel: string;
  /** Tried in order when the default model is overloaded or rate limited (429/503). Ignored if AI_MODEL is set. */
  fallbackModels?: string[];
  /** Extra room for models that spend part of the token budget on hidden reasoning. */
  tokenHeadroom?: number;
  headers?: Record<string, string>;
  /** Overrides the default "has a base URL and, if required, a key" check. */
  isConfigured?: () => boolean;
};

type Options = { timeoutMs?: number; retryDelayMs?: number };

class ChatHttpError extends AIRequestError {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function errorMessage(json: any, raw: string): string {
  // OpenAI-style bodies are { error: { message } }; Gemini wraps that in a list.
  const message = json?.error?.message ?? json?.[0]?.error?.message ?? json?.message;
  return String(message ?? raw).slice(0, 300);
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => (typeof part === "string" ? part : part?.text ?? "")).join("");
  return "";
}

/** Pulls a JSON object out of a model reply, tolerating markdown fences and a sentence around it. */
export function extractJson(text: string): unknown {
  let body = text.trim();
  const fenced = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) body = fenced[1].trim();
  if (!body.startsWith("{")) {
    const start = body.indexOf("{");
    const end = body.lastIndexOf("}");
    if (start >= 0 && end > start) body = body.slice(start, end + 1);
  }
  return JSON.parse(body);
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;

  constructor(
    private readonly preset: CompatPreset,
    private readonly options: Options = {}
  ) {
    this.name = preset.name;
  }

  get model() {
    return process.env.AI_MODEL || this.preset.defaultModel;
  }

  isConfigured() {
    if (this.preset.isConfigured) return this.preset.isConfigured();
    if (!this.preset.baseUrl()) return false;
    return !this.preset.requiresKey || !!this.preset.apiKey();
  }

  /**
   * Sends one chat request and returns the reply text. Free tiers are often busy or rate limited, so a
   * 429/503 is retried once, and then the next fallback model (if any) is tried before giving up.
   */
  private async chat(body: Record<string, unknown>): Promise<string> {
    if (!this.isConfigured()) throw new AIUnavailableError(`${this.name} is not configured`);

    const models = [body.model as string, ...(process.env.AI_MODEL ? [] : this.preset.fallbackModels ?? [])];
    let lastError: unknown;
    for (const [i, model] of models.entries()) {
      try {
        return await this.chatWithRetry({ ...body, model });
      } catch (err) {
        lastError = err;
        const busy = err instanceof ChatHttpError && (err.status === 429 || err.status === 503);
        if (!busy || i === models.length - 1) throw err;
        console.warn(`[ai] ${this.name}: ${model} is busy or rate limited; trying ${models[i + 1]}`);
      }
    }
    throw lastError;
  }

  private async chatWithRetry(body: Record<string, unknown>): Promise<string> {
    const base = (this.preset.baseUrl() ?? "").replace(/\/+$/, "");
    const key = this.preset.apiKey();
    const timeoutMs = this.options.timeoutMs ?? 90_000;

    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let res: Response;
      try {
        res = await fetch(`${base}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}), ...this.preset.headers },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err: any) {
        throw new AIRequestError(err?.name === "AbortError" ? "The AI request timed out" : `Could not reach the AI service (${err?.cause?.code ?? err?.message ?? "network error"})`);
      } finally {
        clearTimeout(timer);
      }

      if ((res.status === 429 || res.status === 503) && attempt === 0) {
        const wait = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(wait) && wait > 0 ? Math.min(wait * 1000, 8000) : this.options.retryDelayMs ?? 2000);
        continue;
      }

      const raw = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(raw);
      } catch {
        /* not JSON */
      }

      if (!res.ok) {
        const label = res.status === 429 ? "rate limited" : res.status === 401 || res.status === 403 ? "not authorised (check the API key)" : "error";
        throw new ChatHttpError(`${res.status} ${label}: ${errorMessage(json, raw)}`, res.status);
      }

      const text = contentToText(json?.choices?.[0]?.message?.content);
      if (!text.trim()) throw new AIRequestError("The AI returned an empty response");
      return text;
    }
  }

  private buildBody(req: AICompleteRequest, extra: Record<string, unknown> = {}): Record<string, unknown> {
    const headroom = this.preset.tokenHeadroom ?? 1;
    const messages = [...(req.system ? [{ role: "system", content: req.system }] : []), ...req.messages];
    return {
      model: this.model,
      messages,
      max_tokens: Math.round((req.maxTokens ?? 1024) * headroom),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      ...extra,
    };
  }

  async complete(req: AICompleteRequest) {
    return { text: (await this.chat(this.buildBody(req))).trim() };
  }

  async completeJson<T>(req: AICompleteJsonRequest<T>): Promise<T> {
    const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(req.schema) as Record<string, unknown>;
    const system = [
      req.system,
      "OUTPUT FORMAT: Reply with one JSON object and nothing else: no markdown, no code fences, no commentary. It must validate against this JSON Schema:",
      JSON.stringify(jsonSchema),
    ]
      .filter(Boolean)
      .join("\n\n");

    let messages = req.messages;
    let lastProblem = "";

    for (let attempt = 0; attempt < 2; attempt++) {
      const body = this.buildBody({ ...req, system, messages }, { response_format: { type: "json_object" } });
      let text: string;
      try {
        text = await this.chat(body);
      } catch (err) {
        // Some models reject JSON mode; the prompt alone still asks for JSON, so try once without it.
        if (err instanceof ChatHttpError && err.status === 400 && /response_format|json/i.test(err.message)) {
          const { response_format: _dropped, ...withoutJsonMode } = body;
          text = await this.chat(withoutJsonMode);
        } else {
          throw err;
        }
      }

      try {
        const parsed = req.schema.safeParse(extractJson(text));
        if (parsed.success) return parsed.data as T;
        lastProblem = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
      } catch {
        lastProblem = "the reply was not valid JSON";
      }

      // One corrective retry: show the model what was wrong.
      messages = [
        ...req.messages,
        { role: "assistant", content: text.slice(0, 4000) },
        { role: "user", content: `That reply was rejected (${lastProblem}). Reply again with only the corrected JSON object.` },
      ];
    }
    throw new AIRequestError(`The AI did not return valid structured output (${lastProblem})`);
  }
}

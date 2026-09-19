import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { AIProvider, AICompleteRequest, AICompleteJsonRequest } from "../types";
import { AIUnavailableError, AIRequestError } from "../types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic | null = null;

  isConfigured() {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  private getClient() {
    if (!this.isConfigured()) throw new AIUnavailableError("ANTHROPIC_API_KEY is not set");
    if (!this.client) this.client = new Anthropic();
    return this.client;
  }

  async complete({ system, messages, maxTokens = 1024 }: AICompleteRequest) {
    try {
      const res = await this.getClient().messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages,
      });
      const block = res.content.find((b) => b.type === "text");
      return { text: block?.type === "text" ? block.text : "" };
    } catch (err) {
      if (err instanceof AIUnavailableError) throw err;
      throw new AIRequestError(err instanceof Error ? err.message : "AI request failed");
    }
  }

  async completeJson<T>({ system, messages, schema, maxTokens = 2048 }: AICompleteJsonRequest<T>): Promise<T> {
    try {
      const res = await this.getClient().messages.parse({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages,
        output_config: { format: zodOutputFormat(schema) },
      });
      if (res.parsed_output === undefined || res.parsed_output === null) {
        throw new AIRequestError("AI returned no parseable output");
      }
      return res.parsed_output as T;
    } catch (err) {
      if (err instanceof AIUnavailableError || err instanceof AIRequestError) throw err;
      throw new AIRequestError(err instanceof Error ? err.message : "AI JSON request failed");
    }
  }
}

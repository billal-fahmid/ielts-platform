import type { AIProvider, AICompleteRequest, AICompleteJsonRequest } from "../types";

/**
 * Development-only stand-in so the AI features can be exercised without API credits.
 * Enabled only with AI_PROVIDER=mock outside production (see provider.ts). Its output is
 * placeholder text, not real feedback, and stored results are tagged with model "mock".
 */

/** Builds a placeholder value that satisfies a zod schema (objects, arrays, numbers, strings...). */
function sample(schema: any): unknown {
  const def = schema?._zod?.def ?? schema?.def;
  switch (def?.type) {
    case "object":
      return Object.fromEntries(Object.entries(def.shape).map(([key, value]) => [key, sample(value)]));
    case "array":
      return [sample(def.element), sample(def.element)];
    case "number":
      return 6;
    case "string":
      return "Placeholder text from the mock AI provider.";
    case "boolean":
      return true;
    case "enum":
      return Object.values(def.entries)[0];
    case "optional":
    case "nullable":
    case "default":
      return sample(def.innerType);
    default:
      return null;
  }
}

export class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly model = "mock";

  isConfigured() {
    return true;
  }

  async complete({ messages }: AICompleteRequest) {
    const last = messages[messages.length - 1]?.content ?? "";
    const quoted = last.length > 80 ? `${last.slice(0, 80)}…` : last;
    return {
      text: [
        "**Mock tutor** (development only, not real teaching).",
        `You wrote: "${quoted}"`,
        "Here is a sample answer with the formatting the tutor uses:",
        "- **Present perfect** links the past to now: I *have lived* here for five years.",
        "- Use it for experiences: She has visited Dubai twice.",
        "1. Try writing one sentence with *have* or *has*.",
        "2. Send it and I will check it.",
        "বাংলায় সংক্ষেপে: এটি একটি পরীক্ষামূলক উত্তর। বাস্তব উত্তরের জন্য AI চালু করুন।",
      ].join("\n"),
    };
  }

  async completeJson<T>({ schema }: AICompleteJsonRequest<T>): Promise<T> {
    return schema.parse(sample(schema));
  }
}

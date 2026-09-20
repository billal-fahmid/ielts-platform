import { NextResponse } from "next/server";
import type { z } from "zod";

const DEFAULT_MAX_BYTES = 1_000_000;

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * Reads and validates a JSON request body. Rejects oversized, malformed and invalid input with a
 * clear 4xx response; the first validation message is safe to show to the user.
 */
export async function readJson<T>(req: Request, schema: z.ZodType<T>, maxBytes = DEFAULT_MAX_BYTES): Promise<ParsedBody<T>> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return { ok: false, response: NextResponse.json({ error: "That request is too large." }, { status: 413 }) };

  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid request." }, { status: 400 }) };
  }
  if (text.length > maxBytes) return { ok: false, response: NextResponse.json({ error: "That request is too large." }, { status: 413 }) };

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid request." }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 }) };
  }
  return { ok: true, data: parsed.data };
}

/** Removes control characters and trims. Use on free text that is stored and shown back to other users. */
export function cleanText(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}

/** Escapes text for safe use inside HTML (emails). React already escapes what it renders. */
export function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Only same-site relative links are allowed in stored URLs such as notification links. */
export function safeInternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^\/(?![/\\])/.test(url) && !/[\u0000-\u001F]/.test(url) ? url : null;
}

/** Media links may be a path on this site or an http(s) address; anything else (javascript:, data:) is dropped. */
export function safeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^\/(?![/\\])/.test(url) || /^https?:\/\//i.test(url) ? url : null;
}

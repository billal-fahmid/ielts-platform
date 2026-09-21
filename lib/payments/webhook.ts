import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentEvent } from "./types";

/** How old a signed callback may be. Older ones are refused, which stops replays. */
export const WEBHOOK_TOLERANCE_SECONDS = 300;

/** The signature a sender must put in `x-signature`: HMAC-SHA256 of "<timestamp>.<raw body>" with the shared secret, in hex. */
export function signPayload(secret: string, timestamp: string, rawBody: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

/** Constant-time comparison, so the signature can't be guessed a byte at a time. */
export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

export type SignedCheck = { ok: true } | { ok: false; reason: "no-secret" | "missing-headers" | "stale" | "bad-signature" };

export function verifySignedRequest(secret: string | undefined, rawBody: string, headers: Headers, now = Date.now()): SignedCheck {
  if (!secret || secret.length < 16) return { ok: false, reason: "no-secret" };
  const signature = headers.get("x-signature");
  const timestamp = headers.get("x-timestamp");
  if (!signature || !timestamp) return { ok: false, reason: "missing-headers" };
  const t = Number(timestamp);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > WEBHOOK_TOLERANCE_SECONDS) return { ok: false, reason: "stale" };
  return safeEqualHex(signature, signPayload(secret, timestamp, rawBody)) ? { ok: true } : { ok: false, reason: "bad-signature" };
}

/** Reads the standard event body: { eventId, type, reference, amount?, currency?, providerRef? }. Null if it isn't one. */
export function parseEventBody(rawBody: string): PaymentEvent | null {
  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return null;
  }
  const types = ["payment.succeeded", "payment.failed", "payment.refunded"];
  if (!data || typeof data.eventId !== "string" || !data.eventId || data.eventId.length > 100) return null;
  if (!types.includes(data.type) || typeof data.reference !== "string" || !data.reference || data.reference.length > 100) return null;
  const amount = data.amount === undefined ? undefined : Number(data.amount);
  if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) return null;
  return {
    eventId: data.eventId,
    type: data.type,
    reference: data.reference,
    amount,
    currency: typeof data.currency === "string" ? data.currency.toUpperCase().slice(0, 3) : undefined,
    providerRef: typeof data.providerRef === "string" ? data.providerRef.slice(0, 100) : undefined,
  };
}

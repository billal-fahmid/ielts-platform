import { NextResponse } from "next/server";

/**
 * Fixed-window rate limiting held in memory. It protects a single server process; if the app is ever
 * run on several servers, swap the store for Redis (the call sites won't change).
 */
type Bucket = { count: number; resetAt: number };
const globalStore = globalThis as unknown as { __rateLimitStore?: Map<string, Bucket>; __rateLimitChecks?: number };
const store = (globalStore.__rateLimitStore ??= new Map<string, Bucket>());

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

/** Test setups can switch limiting off. Never honoured in production. */
function disabled() {
  return process.env.RATE_LIMIT_DISABLED === "true" && process.env.NODE_ENV !== "production";
}

function purgeExpired(now: number) {
  for (const [key, bucket] of store) if (bucket.resetAt <= now) store.delete(key);
}

export function checkRateLimit(name: string, key: string, limit: number, windowSeconds: number, now = Date.now()): RateLimitResult {
  if (disabled()) return { ok: true, remaining: limit, retryAfterSeconds: 0 };

  globalStore.__rateLimitChecks = (globalStore.__rateLimitChecks ?? 0) + 1;
  if (globalStore.__rateLimitChecks % 500 === 0) purgeExpired(now);

  const id = `${name}:${key}`;
  let bucket = store.get(id);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowSeconds * 1000 };
    store.set(id, bucket);
  }
  bucket.count++;
  const ok = bucket.count <= limit;
  return { ok, remaining: Math.max(0, limit - bucket.count), retryAfterSeconds: ok ? 0 : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
}

/** Forgets a counter, e.g. after a successful login. */
export function resetRateLimit(name: string, key: string) {
  store.delete(`${name}:${key}`);
}

/**
 * The caller's IP address. Forwarding headers can be forged, so they are only trusted when the app
 * runs behind a reverse proxy and TRUST_PROXY=true is set; the last entry is the one our proxy saw.
 */
export function clientIp(req: Request): string {
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length) return parts[parts.length - 1];
    }
    const real = req.headers.get("x-real-ip");
    if (real) return real.trim();
  }
  return "unknown";
}

/**
 * Returns a 429 response when the caller is over the limit, otherwise null.
 * `key` defaults to the client's IP; pass a user id for signed-in endpoints.
 */
export function rateLimit(req: Request, opts: { name: string; limit: number; windowSeconds: number; key?: string }): NextResponse | null {
  const result = checkRateLimit(opts.name, opts.key ?? clientIp(req), opts.limit, opts.windowSeconds);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
  );
}

/** Limits for endpoints that call the AI, which costs money and time. */
export function aiRateLimit(req: Request, userId: string, name = "ai"): NextResponse | null {
  return rateLimit(req, { name, limit: 40, windowSeconds: 600, key: userId });
}

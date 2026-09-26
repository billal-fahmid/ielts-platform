import { NextResponse } from "next/server";
import type { z } from "zod";
import { requireRole, requireUser, type Role, type SessionUser } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { logError } from "@/lib/security/error-log";
import { TeachingError } from "@/lib/services/teaching";

/**
 * Runs a community or rooms API action for any signed-in member (students and teachers), or only for the given roles.
 * Rate limited, body validated, and errors turned into plain messages; unexpected errors are logged and hidden.
 */
export async function memberRoute<T = undefined>(
  req: Request,
  opts: { schema?: z.ZodType<T>; path: string; roles?: Role[]; limit?: number },
  run: (ctx: { user: SessionUser; body: T }) => unknown | Promise<unknown>
) {
  const g = opts.roles ? await requireRole(...opts.roles) : await requireUser();
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "community-write", limit: opts.limit ?? 60, windowSeconds: 60, key: g.user.id });
  if (limited) return limited;

  let body = undefined as T;
  if (opts.schema) {
    const parsed = await readJson(req, opts.schema, 100_000);
    if (!parsed.ok) return parsed.response;
    body = parsed.data;
  }

  try {
    return NextResponse.json((await run({ user: g.user, body })) ?? { ok: true });
  } catch (e: any) {
    if (e instanceof TeachingError) return NextResponse.json({ error: e.message }, { status: e.status });
    logError("api:" + opts.path, e, { method: req.method, userId: g.user.id });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

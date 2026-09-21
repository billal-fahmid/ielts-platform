import { NextResponse } from "next/server";
import type { z } from "zod";
import { requireRole, type SessionUser } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { logError } from "@/lib/security/error-log";
import { getEntitlements, hasFeature } from "@/lib/services/plans";
import { upgradeResponse } from "@/lib/plans/gate";
import type { PlanFeature } from "@/lib/plans/features";
import { TeachingError } from "@/lib/services/teaching";

/**
 * Runs a student API action: signed-in student only, rate limited, optionally needing a plan feature (402 otherwise),
 * body validated, and errors turned into plain messages. Unexpected errors are logged and hidden.
 */
export async function studentRoute<T = undefined>(
  req: Request,
  opts: { schema?: z.ZodType<T>; path: string; feature?: PlanFeature },
  run: (ctx: { user: SessionUser; body: T }) => unknown | Promise<unknown>
) {
  const g = await requireRole("STUDENT");
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "student-write", limit: 60, windowSeconds: 60, key: g.user.id });
  if (limited) return limited;
  if (opts.feature && !hasFeature(getEntitlements(g.user.id), opts.feature)) return upgradeResponse(opts.feature);

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

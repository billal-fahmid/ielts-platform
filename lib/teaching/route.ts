import { NextResponse } from "next/server";
import type { z } from "zod";
import { requireRole, type SessionUser } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { logError } from "@/lib/security/error-log";
import { ResourceError } from "@/lib/admin/resources";
import { TeachingError } from "@/lib/services/teaching";

/**
 * Runs a teacher API action: signed-in teacher only, rate limited, body validated, and errors turned into
 * plain messages. Problems the teacher can fix are shown as-is; anything unexpected is logged and hidden.
 */
export async function teacherRoute<T = undefined>(
  req: Request,
  opts: { schema?: z.ZodType<T>; path: string },
  run: (ctx: { user: SessionUser; body: T }) => unknown | Promise<unknown>
) {
  const g = await requireRole("TEACHER");
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "teacher-write", limit: 120, windowSeconds: 60, key: g.user.id });
  if (limited) return limited;

  let body = undefined as T;
  if (opts.schema) {
    const parsed = await readJson(req, opts.schema);
    if (!parsed.ok) return parsed.response;
    body = parsed.data;
  }

  try {
    const result = await run({ user: g.user, body });
    return NextResponse.json(result ?? { ok: true });
  } catch (e: any) {
    if (e instanceof TeachingError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof ResourceError) return NextResponse.json({ error: e.message }, { status: 400 });
    logError("api:" + opts.path, e, { method: req.method, userId: g.user.id });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

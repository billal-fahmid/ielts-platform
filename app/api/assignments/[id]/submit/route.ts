import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { logError } from "@/lib/security/error-log";
import { submitAssignment } from "@/lib/services/assignments";
import { TeachingError } from "@/lib/services/teaching";

const schema = z.object({
  answerText: z.string().optional(),
  linkUrl: z.string().nullish(),
});

/** A student hands in (or edits) their answer. Only students the assignment is for can do this. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requireRole("STUDENT");
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "assignment-submit", limit: 30, windowSeconds: 60, key: g.user.id });
  if (limited) return limited;

  const body = await readJson(req, schema, 100_000);
  if (!body.ok) return body.response;

  try {
    const submission = submitAssignment(g.user.id, id, body.data);
    return NextResponse.json({ submission: { id: submission.id, status: submission.status, submittedAt: submission.submittedAt } });
  } catch (e: any) {
    if (e instanceof TeachingError) return NextResponse.json({ error: e.message }, { status: e.status });
    logError("api:/api/assignments/submit", e, { method: "POST", userId: g.user.id });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

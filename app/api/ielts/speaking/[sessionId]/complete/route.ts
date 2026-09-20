import { denyUnlessFeature } from "@/lib/plans/gate";
import { aiRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { completeSession, evaluateSession, getSession, getTurns } from "@/lib/services/speaking";
import { awardXp } from "@/lib/services/gamification";

export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;
  const limited = aiRateLimit(req, userId);
  if (limited) return limited;

  const { sessionId } = await params;
  const speakingSession = getSession(sessionId);
  if (!speakingSession || speakingSession.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (speakingSession.status !== "IN_PROGRESS") return NextResponse.json({ error: "Session already finished" }, { status: 409 });

  if (!getTurns(sessionId).some((t) => t.transcript.trim().length > 0)) {
    return NextResponse.json({ error: "No answers were recorded, so there is nothing to give feedback on." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const totalDurationSeconds = Math.min(7200, Math.max(0, Number(body?.totalDurationSeconds) || 0));

  if (body?.defer !== true) {
    const denied = denyUnlessFeature(userId, "AI_SPEAKING");
    if (denied) return denied;
  }
  completeSession(sessionId, totalDurationSeconds);

  // Inside a mock test the marking happens once at the end, and the mock awards its own XP.
  if (body?.defer === true) return NextResponse.json({ sessionId, evaluated: false });

  await awardXp(userId, 40);

  // The answers are saved either way; if AI is unavailable the results page offers a retry.
  const result = await evaluateSession(sessionId);
  return NextResponse.json({ sessionId, evaluated: result.ok });
}

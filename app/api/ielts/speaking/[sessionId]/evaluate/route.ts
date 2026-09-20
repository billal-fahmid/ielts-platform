import { denyUnlessFeature } from "@/lib/plans/gate";
import { aiRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { evaluateSession, getSession } from "@/lib/services/speaking";

export const maxDuration = 120;

/** Retry AI feedback for a session that finished while AI was unavailable. */
export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;
  const denied = denyUnlessFeature(userId, "AI_SPEAKING", "ADVANCED_MOCK");
  if (denied) return denied;
  const limited = aiRateLimit(req, userId);
  if (limited) return limited;

  const { sessionId } = await params;
  const speakingSession = getSession(sessionId);
  if (!speakingSession || speakingSession.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (speakingSession.status !== "COMPLETED") return NextResponse.json({ error: "Finish the session first" }, { status: 409 });

  const result = await evaluateSession(sessionId);
  if (result.ok) return NextResponse.json({ evaluated: true });
  return NextResponse.json({ evaluated: false, message: result.message });
}

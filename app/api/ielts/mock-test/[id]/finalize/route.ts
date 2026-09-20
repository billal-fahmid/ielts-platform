import { denyUnlessFeature } from "@/lib/plans/gate";
import { aiRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { finalizeMockAttempt, getMockAttempt } from "@/lib/services/mock-test";

export const maxDuration = 120;

/** Marks Writing and Speaking with the AI and works out the overall band. Safe to call again after a failure. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;
  const denied = denyUnlessFeature(userId, "ADVANCED_MOCK");
  if (denied) return denied;
  const limited = aiRateLimit(req, userId);
  if (limited) return limited;

  const { id } = await params;
  const attempt = getMockAttempt(id);
  if (!attempt || attempt.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await finalizeMockAttempt(id);
  return NextResponse.json(result);
}

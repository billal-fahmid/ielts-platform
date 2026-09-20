import { denyUnlessFeature } from "@/lib/plans/gate";
import { aiRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { addCoachNotes, getPlan } from "@/lib/services/study-plan";

export const maxDuration = 120;

/** Retries the AI coach notes for a plan that was saved without them. */
export async function POST(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;
  const denied = denyUnlessFeature(userId, "IELTS_PRACTICE");
  if (denied) return denied;
  const limited = aiRateLimit(req, userId);
  if (limited) return limited;

  const { planId } = await params;
  const plan = getPlan(planId);
  if (!plan || plan.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await addCoachNotes(planId);
  return NextResponse.json({ added: result.ok, message: result.ok ? null : result.message });
}

import { denyUnlessFeature } from "@/lib/plans/gate";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateStudyPlan } from "@/lib/services/study-plan";
import { rateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 120;

const generating = new Set<string>();

/** Builds a fresh 7-day plan for the signed-in student. The plan is always saved; AI coach notes are added when the AI is available. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;
  const denied = denyUnlessFeature(userId, "IELTS_PRACTICE");
  if (denied) return denied;

  const limited = rateLimit(req, { name: "study-plan", limit: 10, windowSeconds: 3600, key: userId });
  if (limited) return limited;

  if (generating.has(userId)) return NextResponse.json({ error: "Your plan is already being created." }, { status: 409 });
  generating.add(userId);
  try {
    const { plan, notes } = await generateStudyPlan(userId);
    return NextResponse.json({
      planId: plan.id,
      aiAssisted: plan.aiAssisted,
      message: notes.ok ? null : "Your plan is ready. Coach notes aren't available right now, so this plan is based on your results only.",
    });
  } finally {
    generating.delete(userId);
  }
}

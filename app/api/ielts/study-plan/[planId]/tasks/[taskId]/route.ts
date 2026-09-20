import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setTaskCompleted } from "@/lib/services/study-plan";
import { planProgress } from "@/lib/ielts/plan-builder";

export async function PATCH(req: Request, { params }: { params: Promise<{ planId: string; taskId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json().catch(() => null);
  if (typeof body?.completed !== "boolean") return NextResponse.json({ error: "Send { completed: true | false }." }, { status: 400 });

  const { planId, taskId } = await params;
  const plan = setTaskCompleted(userId, planId, taskId, body.completed);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ progress: planProgress(plan.days) });
}

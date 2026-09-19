import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { onboardingSchema } from "@/lib/validations";
import { updateProfile } from "@/lib/services/users";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  updateProfile((session.user as any).id, {
    englishLevel: parsed.data.englishLevel,
    ieltsTarget: parsed.data.ieltsTarget,
    targetExamDate: parsed.data.targetExamDate,
    reason: parsed.data.reason,
    focusSkill: parsed.data.focusSkill,
    onboardingCompleted: true,
  });

  return NextResponse.json({ ok: true });
}

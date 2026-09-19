import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { profileUpdateSchema } from "@/lib/validations";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateProfile } from "@/lib/services/users";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const userId = (session.user as any).id;
  db.update(users).set({ name: parsed.data.name }).where(eq(users.id, userId)).run();
  updateProfile(userId, {
    phone: parsed.data.phone,
    education: parsed.data.education,
    countryGoal: parsed.data.countryGoal,
    dailyGoalMinutes: parsed.data.dailyGoalMinutes,
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { finalizeMockAttempt, getMockAttempt } from "@/lib/services/mock-test";

export const maxDuration = 120;

/** Marks Writing and Speaking with the AI and works out the overall band. Safe to call again after a failure. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;

  const { id } = await params;
  const attempt = getMockAttempt(id);
  if (!attempt || attempt.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await finalizeMockAttempt(id);
  return NextResponse.json(result);
}

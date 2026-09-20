import { denyUnlessFeature } from "@/lib/plans/gate";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMockAttempt, syncMockAttempt } from "@/lib/services/mock-test";
import { MAX_ESSAY_CHARS } from "@/lib/ielts/writing";

/**
 * Moves the test on: submits sections whose time is up, and accepts the student finishing
 * Writing (both essays) or Speaking (a completed session). Every call is validated against the
 * server's own clock and records, so the client can't skip ahead.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;
  const denied = denyUnlessFeature(userId, "MOCK_TESTS");
  if (denied) return denied;

  const { id } = await params;
  const attempt = getMockAttempt(id);
  if (!attempt || attempt.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const input: Parameters<typeof syncMockAttempt>[1] = {};
  if (body?.writing) {
    const { task1, task2 } = body.writing;
    if (typeof task1 !== "string" || typeof task2 !== "string") return NextResponse.json({ error: "Both essays are required." }, { status: 400 });
    if (task1.length > MAX_ESSAY_CHARS || task2.length > MAX_ESSAY_CHARS) return NextResponse.json({ error: "An essay is too long." }, { status: 400 });
    input.writing = { task1, task2 };
  }
  if (typeof body?.speakingSessionId === "string") input.speakingSessionId = body.speakingSessionId;

  const updated = syncMockAttempt(id, input);
  return NextResponse.json({ currentSection: updated?.currentSection, status: updated?.status });
}

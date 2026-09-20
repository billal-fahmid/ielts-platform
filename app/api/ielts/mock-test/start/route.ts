import { denyUnlessFeature } from "@/lib/plans/gate";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { startOrResumeMockAttempt, syncMockAttempt } from "@/lib/services/mock-test";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;
  const denied = denyUnlessFeature(userId, "MOCK_TESTS");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const mockTestId = typeof body?.mockTestId === "string" ? body.mockTestId : "";
  if (!mockTestId) return NextResponse.json({ error: "Choose a mock test." }, { status: 400 });

  try {
    const attempt = startOrResumeMockAttempt(userId, mockTestId);
    syncMockAttempt(attempt.id); // an attempt resumed after a long break may already have expired sections
    return NextResponse.json({ attemptId: attempt.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't start the test." }, { status: 409 });
  }
}

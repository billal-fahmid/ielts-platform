import { denyUnlessFeature } from "@/lib/plans/gate";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { beginSection, getMockAttempt } from "@/lib/services/mock-test";

/** Starts the clock for the section the student is on. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;
  const denied = denyUnlessFeature(userId, "MOCK_TESTS");
  if (denied) return denied;

  const { id } = await params;
  const attempt = getMockAttempt(id);
  if (!attempt || attempt.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.status !== "IN_PROGRESS") return NextResponse.json({ error: "This test is already finished." }, { status: 409 });

  const updated = beginSection(id);
  return NextResponse.json({ currentSection: updated?.currentSection });
}

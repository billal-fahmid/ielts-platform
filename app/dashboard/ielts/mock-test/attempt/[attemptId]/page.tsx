import { checkFeature } from "@/lib/plans/gate";
import { UpgradeWall } from "@/components/plans/upgrade-wall";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMockAttempt, getMockTest, getStage, syncMockAttempt } from "@/lib/services/mock-test";
import { MockTestRunner } from "@/components/ielts/mock-test-runner";

export default async function MockTestAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;
  const gate = checkFeature(userId, "MOCK_TESTS");
  if (!gate.allowed) return <UpgradeWall title="Full mock tests" description="Sit all four IELTS sections in one timed, full-screen test." requiredPlanName={gate.requiredPlanName} currentPlanName={gate.ent.plan.name} />;

  const attempt = getMockAttempt(attemptId);
  if (!attempt || attempt.userId !== userId) redirect("/dashboard/ielts/mock-test");
  if (attempt.status !== "IN_PROGRESS") redirect(`/dashboard/ielts/mock-test/result/${attemptId}`);

  // Anything whose time ran out while the student was away is submitted here, before the page renders.
  const synced = syncMockAttempt(attemptId);
  if (!synced || synced.currentSection === "DONE" || synced.status !== "IN_PROGRESS") redirect(`/dashboard/ielts/mock-test/result/${attemptId}`);

  const mock = getMockTest(synced.mockTestId);
  return <MockTestRunner attemptId={attemptId} mockTitle={mock?.title ?? "Mock test"} stage={getStage(synced)} />;
}

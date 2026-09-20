import { checkFeature } from "@/lib/plans/gate";
import { UpgradeWall } from "@/components/plans/upgrade-wall";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTest, getSections, getQuestionsForTest, startOrResumeAttempt } from "@/lib/services/listening";
import { listeningRunnerProps } from "@/lib/services/runner-props";
import { ListeningRunner } from "@/components/ielts/listening-runner";

export default async function ListeningTestPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;
  const gate = checkFeature(userId, "IELTS_PRACTICE");
  if (!gate.allowed) return <UpgradeWall title="IELTS Listening practice" description="Timed listening tests with band estimates and full transcripts." requiredPlanName={gate.requiredPlanName} currentPlanName={gate.ent.plan.name} />;

  const test = getTest(testId);
  if (!test || !test.published) notFound();
  if (getSections(testId).length === 0 || getQuestionsForTest(testId).length === 0) notFound();

  const attempt = startOrResumeAttempt(userId, testId);

  // Never sends transcripts, correct answers, or explanations to the client before submission.
  return <ListeningRunner {...listeningRunnerProps(attempt)} />;
}

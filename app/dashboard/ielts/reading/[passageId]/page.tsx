import { checkFeature } from "@/lib/plans/gate";
import { UpgradeWall } from "@/components/plans/upgrade-wall";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPassage, getQuestionsForPassage, startOrResumeAttempt } from "@/lib/services/reading";
import { readingRunnerProps } from "@/lib/services/runner-props";
import { ReadingRunner } from "@/components/ielts/reading-runner";

export default async function ReadingTestPage({ params }: { params: Promise<{ passageId: string }> }) {
  const { passageId } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;
  const gate = checkFeature(userId, "IELTS_PRACTICE");
  if (!gate.allowed) return <UpgradeWall title="IELTS Reading practice" description="Timed reading passages with every IELTS question type." requiredPlanName={gate.requiredPlanName} currentPlanName={gate.ent.plan.name} />;

  const passage = getPassage(passageId);
  if (!passage || !passage.published) notFound();
  if (getQuestionsForPassage(passageId).length === 0) notFound();

  const attempt = startOrResumeAttempt(userId, passageId);

  // Never sends correct answers or explanations to the client before submission.
  return <ReadingRunner {...readingRunnerProps(attempt)} />;
}

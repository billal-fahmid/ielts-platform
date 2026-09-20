import { checkFeature } from "@/lib/plans/gate";
import { UpgradeWall } from "@/components/plans/upgrade-wall";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { SpeakingSession } from "@/components/ielts/speaking-session";
import { URL_MODES } from "@/lib/services/speaking";

export default async function SpeakingSessionPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;
  const gate = checkFeature(userId, "AI_SPEAKING");
  if (!gate.allowed) return <UpgradeWall title="IELTS Speaking practice" description="Practise with an AI examiner and get feedback on your answers." requiredPlanName={gate.requiredPlanName} currentPlanName={gate.ent.plan.name} />;
  if (!(mode in URL_MODES)) notFound();
  return <SpeakingSession mode={mode as "full" | "part1" | "part2" | "part3"} />;
}

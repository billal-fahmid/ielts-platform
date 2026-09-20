import { notFound } from "next/navigation";
import { SpeakingSession } from "@/components/ielts/speaking-session";
import { URL_MODES } from "@/lib/services/speaking";

export default async function SpeakingSessionPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode } = await params;
  if (!(mode in URL_MODES)) notFound();
  return <SpeakingSession mode={mode as "full" | "part1" | "part2" | "part3"} />;
}

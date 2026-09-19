import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { latestAssessmentResult } from "@/lib/services/quiz";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { LEVEL_LABELS } from "@/lib/utils";
import { AlertTriangle, Sparkles } from "lucide-react";
import { AssessmentChart } from "./chart";

export default async function AssessmentResultPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const result = latestAssessmentResult(userId);

  if (!result) redirect("/dashboard/assessment");

  const skillScores = [
    { name: "Grammar", value: result.grammarScore },
    { name: "Vocabulary", value: result.vocabularyScore },
    { name: "Reading", value: result.readingScore },
    { name: "Listening", value: result.listeningScore },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <p className="text-sm font-medium text-primary">Your results</p>
        <h1 className="mt-1.5 font-display text-3xl text-ink">
          {result.estimatedLevel} — {LEVEL_LABELS[result.estimatedLevel as keyof typeof LEVEL_LABELS]}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">Overall score: {Math.round(result.overallScore)}%</p>
      </div>

      <Card className="mt-8 p-6">
        <h2 className="font-display text-lg text-ink">Skill breakdown</h2>
        <AssessmentChart data={skillScores} />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {skillScores.map((s) => (
            <div key={s.name} className="rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-ink-soft">{s.name}</p>
              <p className="mt-1 font-display text-lg text-ink">{Math.round(s.value)}%</p>
            </div>
          ))}
        </div>
      </Card>

      {result.weakAreas && result.weakAreas.length > 0 && (
        <Card className="mt-6 p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-accent" />
            <h2 className="font-display text-lg text-ink">Areas to focus on</h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.weakAreas.map((w) => (
              <Badge key={w} tone="accent" className="capitalize">
                {w}
              </Badge>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink-soft">
            We recommend starting with the Grammar Lab and daily vocabulary review to
            strengthen these areas before moving to advanced courses.
          </p>
        </Card>
      )}

      <Card className="mt-6 flex flex-col items-center gap-3 p-8 text-center">
        <Sparkles className="h-7 w-7 text-primary" />
        <h2 className="font-display text-xl text-ink">Your personalized path is ready</h2>
        <p className="max-w-sm text-sm text-ink-soft">
          Based on your {result.estimatedLevel} level, we recommend starting with
          courses matched to your current ability.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton href="/dashboard/courses">Browse courses</LinkButton>
          <LinkButton href="/dashboard" variant="outline">
            Go to dashboard
          </LinkButton>
        </div>
      </Card>
    </div>
  );
}

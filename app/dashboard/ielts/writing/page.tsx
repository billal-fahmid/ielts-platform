import { checkFeature } from "@/lib/plans/gate";
import { UpgradeWall } from "@/components/plans/upgrade-wall";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { listPublishedPrompts, listUserSubmissions, getEvaluation } from "@/lib/services/writing";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MIN_WORDS, SUGGESTED_MINUTES, WRITING_CATEGORY_LABELS, type TaskType } from "@/lib/ielts/writing";
import { PenLine, Clock, FileText } from "lucide-react";

export default async function WritingListPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const gate = checkFeature(userId, "AI_WRITING");
  if (!gate.allowed) return <UpgradeWall title="IELTS Writing with AI feedback" description="Write essays and get an estimated band with detailed feedback." requiredPlanName={gate.requiredPlanName} currentPlanName={gate.ent.plan.name} />;

  const prompts = listPublishedPrompts();
  const submissions = listUserSubmissions(userId, 8).map((s) => ({ ...s, evaluation: getEvaluation(s.id) }));

  const groups: { type: TaskType; title: string; blurb: string }[] = [
    { type: "TASK1", title: "Task 1", blurb: "Describe a graph, chart, table, map or process in at least 150 words." },
    { type: "TASK2", title: "Task 2", blurb: "Write an essay in response to a question in at least 250 words." },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-ink">IELTS Writing</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Write a response, save drafts, and get AI feedback with an estimated band range. AI feedback is a practice estimate, not an official IELTS score.
        </p>
      </div>

      {prompts.length === 0 && (
        <EmptyState icon={PenLine} title="No writing tasks published yet" description="Check back soon — new practice tasks are added regularly." />
      )}

      {groups.map((g) => {
        const items = prompts.filter((p) => p.taskType === g.type);
        if (items.length === 0) return null;
        return (
          <section key={g.type} className="flex flex-col gap-3">
            <div>
              <h2 className="font-display text-lg text-ink">{g.title}</h2>
              <p className="text-sm text-ink-soft">{g.blurb}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((p) => (
                <Link key={p.id} href={`/dashboard/ielts/writing/${p.id}`}>
                  <Card className="flex h-full flex-col gap-3 p-5 transition-colors hover:border-primary">
                    <Badge tone="neutral" className="self-start">
                      {WRITING_CATEGORY_LABELS[p.category] ?? p.category}
                    </Badge>
                    <p className="line-clamp-3 text-sm text-ink">{p.promptText}</p>
                    <div className="mt-auto flex items-center gap-4 text-xs text-ink-soft">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {SUGGESTED_MINUTES[p.taskType]} min
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" /> {MIN_WORDS[p.taskType]}+ words
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      {submissions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Your recent submissions</h2>
          <Card className="divide-y divide-border">
            {submissions.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/ielts/writing/submission/${s.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-primary-soft/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{s.promptTextSnapshot}</p>
                  <p className="text-xs text-ink-soft">
                    {s.taskType === "TASK1" ? "Task 1" : "Task 2"} · {s.wordCount} words
                  </p>
                </div>
                {s.evaluation ? (
                  <Badge tone="primary">AI est. Band {s.evaluation.estimatedBand.toFixed(1)}</Badge>
                ) : (
                  <Badge tone="neutral">Feedback pending</Badge>
                )}
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

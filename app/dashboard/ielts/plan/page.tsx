import { checkFeature } from "@/lib/plans/gate";
import { UpgradeWall } from "@/components/plans/upgrade-wall";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLatestPlan, todaysDay } from "@/lib/services/study-plan";
import { planProgress, type PlanTaskType } from "@/lib/ielts/plan-builder";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { AddNotesButton, GeneratePlanButton, TaskCheck } from "@/components/ielts/plan-controls";
import { CalendarCheck, Clock, Sparkles, Headphones, BookOpen, PenLine, Mic, Languages, Bot, ClipboardCheck, BookA } from "lucide-react";

const TASK_ICONS: Record<PlanTaskType, typeof Clock> = {
  LISTENING: Headphones,
  READING: BookOpen,
  WRITING: PenLine,
  SPEAKING: Mic,
  VOCABULARY: Languages,
  GRAMMAR: BookA,
  TUTOR: Bot,
  MOCK: ClipboardCheck,
};

function formatDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export default async function StudyPlanPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const gate = checkFeature(userId, "IELTS_PRACTICE");
  if (!gate.allowed) return <UpgradeWall title="Your 7-day study plan" description="A week of practice built from your own results." requiredPlanName={gate.requiredPlanName} currentPlanName={gate.ent.plan.name} />;
  const plan = getLatestPlan(userId);

  if (!plan) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl text-ink">Your 7-day study plan</h1>
          <p className="mt-1 text-sm text-ink-soft">A week of practice built from your own results, target band and daily study goal.</p>
        </div>
        <EmptyState
          icon={CalendarCheck}
          title="You don't have a plan yet"
          description="We'll look at your results and put together seven days of practice that focus on what will help you most."
          action={<GeneratePlanButton />}
        />
      </div>
    );
  }

  const progress = planProgress(plan.days);
  const today = todaysDay(plan);
  const finished = !today;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Your 7-day study plan</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Created {new Date(plan.generatedAt ?? Date.now()).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            {plan.targetExamDate ? ` · exam on ${plan.targetExamDate}` : ""}
          </p>
        </div>
        <GeneratePlanButton replacing />
      </div>

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-ink">
            {progress.done} of {progress.total} tasks done
          </span>
          <Badge tone={plan.aiAssisted ? "accent" : "neutral"}>{plan.aiAssisted ? "Plan by rules · notes by AI coach" : "Built from your results"}</Badge>
        </div>
        <ProgressBar value={progress.percent} />
        {plan.summary && <p className="text-sm text-ink-soft">{plan.summary}</p>}
        {!plan.aiAssisted && <AddNotesButton planId={plan.id} />}
        <p className="text-xs text-ink-soft">
          Every task comes from your own results and the practice material on the platform. Bands mentioned are estimates, not official IELTS scores.
        </p>
      </Card>

      {finished && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-primary/40 p-5">
          <p className="text-sm text-ink">This plan&apos;s week is over. Create a new one to keep going based on your latest results.</p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {plan.days.map((d) => {
          const isToday = today?.day === d.day && !finished;
          const dayDone = d.tasks.every((t) => t.completed);
          return (
            <Card key={`${plan.id}-${d.day}`} className={`flex flex-col gap-3 p-5 ${isToday ? "border-primary ring-1 ring-primary/30" : ""}`} data-testid={`plan-day-${d.day}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">
                  Day {d.day} · <span className="text-ink-soft">{formatDay(d.date)}</span>
                </span>
                <div className="flex gap-1.5">
                  {isToday && <Badge tone="primary">Today</Badge>}
                  {dayDone && <Badge tone="success">Done</Badge>}
                </div>
              </div>
              <h2 className="font-display text-lg text-ink">{d.focus}</h2>
              <p className="text-xs text-ink-soft">{d.reason}</p>
              {d.note && (
                <p className="flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2 text-xs text-ink">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{d.note}</span>
                </p>
              )}
              <ul className="flex flex-col gap-2.5">
                {d.tasks.map((t) => {
                  const Icon = TASK_ICONS[t.type] ?? Clock;
                  return (
                    <li key={`${plan.id}-${t.id}`} className="flex items-start gap-3">
                      <TaskCheck planId={plan.id} taskId={t.id} initial={t.completed} label={t.title} />
                      <div className="min-w-0 flex-1">
                        <Link href={t.url} className={`flex items-start gap-1.5 text-sm hover:text-primary ${t.completed ? "text-ink-soft line-through" : "text-ink"}`}>
                          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>{t.title}</span>
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
                          <Clock className="h-3 w-3" /> {t.durationMinutes >= 60 ? `about ${Math.round(t.durationMinutes / 60)} hours` : `${t.durationMinutes} min`}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

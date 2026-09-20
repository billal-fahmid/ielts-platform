import Link from "next/link";
import { auth } from "@/lib/auth";
import { getProfile } from "@/lib/services/users";
import { getEstimatedBands, examCountdownDays } from "@/lib/services/ielts-dashboard";
import { refreshRecommendations } from "@/lib/services/recommendations";
import { getLatestPlan, todaysDay } from "@/lib/services/study-plan";
import { planProgress } from "@/lib/ielts/plan-builder";
import { DismissRecommendation, GeneratePlanButton, TaskCheck } from "@/components/ielts/plan-controls";
import { ProgressBar } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { BandChart } from "./band-chart";
import { Target, CalendarClock, Headphones, BookOpenCheck, PenLine, Mic, Sparkles, ArrowRight, ClipboardCheck, CalendarCheck } from "lucide-react";

const SKILLS = [
  { key: "listening", label: "Listening", href: "/dashboard/ielts/listening", icon: Headphones },
  { key: "reading", label: "Reading", href: "/dashboard/ielts/reading", icon: BookOpenCheck },
  { key: "writing", label: "Writing", href: "/dashboard/ielts/writing", icon: PenLine },
  { key: "speaking", label: "Speaking", href: "/dashboard/ielts/speaking", icon: Mic },
] as const;

export default async function IeltsDashboardPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const profile = getProfile(userId);
  const bands = getEstimatedBands(userId);
  const countdown = examCountdownDays(profile?.targetExamDate);
  const recommendations = refreshRecommendations(userId);
  const plan = getLatestPlan(userId);
  const todayPlan = plan ? todaysDay(plan) : null;
  const planStats = plan ? planProgress(plan.days) : null;

  const chartData = SKILLS.map((s) => ({ name: s.label as string, value: bands[s.key] })).filter(
    (d): d is { name: string; value: number } => d.value !== null
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-ink">IELTS Prep</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Your estimated bands, exam countdown, and skill-by-skill progress.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Target}
          label="Target band"
          value={profile?.ieltsTarget ? `Band ${profile.ieltsTarget.toFixed(1)}` : "Not set"}
          sub={!profile?.ieltsTarget ? "Set a target in onboarding" : undefined}
        />
        <StatCard
          icon={Sparkles}
          label="Estimated band"
          value={bands.overall !== null ? `Band ${bands.overall.toFixed(1)}` : "—"}
          sub="AI + practice estimate"
          tone="accent"
        />
        <StatCard
          icon={CalendarClock}
          label="Exam countdown"
          value={countdown !== null ? (countdown >= 0 ? `${countdown} days` : "Date passed") : "Not set"}
          sub={profile?.targetExamDate ? profile.targetExamDate : "Set your exam date"}
        />
        <StatCard
          icon={BookOpenCheck}
          label="English level"
          value={profile?.englishLevel ?? "—"}
          sub="From your last assessment"
        />
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 border-primary/40 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-lg text-ink">Full mock test</h2>
            <p className="text-sm text-ink-soft">All four sections in one timed sitting, with an estimated overall band at the end.</p>
          </div>
        </div>
        <LinkButton href="/dashboard/ielts/mock-test">
          Take a mock test <ArrowRight className="h-4 w-4" />
        </LinkButton>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Skill breakdown</h2>
          <Badge tone="neutral">AI estimates, not official IELTS scores</Badge>
        </div>
        <BandChart data={chartData} />

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SKILLS.map((s) => {
            const value = bands[s.key];
            return (
              <Link
                key={s.key}
                href={s.href}
                className="flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:border-primary"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <s.icon className="h-4.5 w-4.5" />
                  </span>
                  {value !== null ? (
                    <Badge tone="primary">Band {value.toFixed(1)}</Badge>
                  ) : (
                    <Badge tone="neutral">Not yet assessed</Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-ink">{s.label}</p>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-6" data-testid="plan-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-ink">Your 7-day plan</h2>
          {plan && (
            <Link href="/dashboard/ielts/plan" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              See the full plan <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        {!plan ? (
          <EmptyState
            icon={CalendarCheck}
            title="Get a plan built around your results"
            description="Seven days of practice chosen from your estimated bands, weak spots, target and daily goal."
            action={<GeneratePlanButton />}
          />
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-ink-soft">
                {planStats!.done} of {planStats!.total} tasks done
              </p>
              <ProgressBar value={planStats!.percent} />
            </div>
            {todayPlan ? (
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs uppercase tracking-wide text-ink-soft">Day {todayPlan.day} · {todayPlan.focus}</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {todayPlan.tasks.map((t) => (
                    <li key={`${plan.id}-${t.id}`} className="flex items-start gap-3">
                      <TaskCheck planId={plan.id} taskId={t.id} initial={t.completed} label={t.title} />
                      <Link href={t.url} className={`text-sm hover:text-primary ${t.completed ? "text-ink-soft line-through" : "text-ink"}`}>
                        {t.title} <span className="text-xs text-ink-soft">· {t.durationMinutes >= 60 ? `about ${Math.round(t.durationMinutes / 60)} hours` : `${t.durationMinutes} min`}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                <p className="text-sm text-ink-soft">This plan&apos;s week is over. Create a new one from your latest results.</p>
                <GeneratePlanButton replacing />
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="p-6" data-testid="recommendations-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-ink">Recommended for you</h2>
          <Badge tone="neutral">Based on your results · estimates only</Badge>
        </div>
        {recommendations.length === 0 ? (
          <EmptyState icon={Sparkles} title="You're all caught up" description="Keep practising and we'll update your suggestions as your results change." />
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {recommendations.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-lg border border-border p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{r.category.charAt(0) + r.category.slice(1).toLowerCase()}</Badge>
                    <p className="text-sm font-medium text-ink">{r.title}</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{r.description}</p>
                  {r.actionUrl && (
                    <Link href={r.actionUrl} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      Start now <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
                <DismissRecommendation id={r.id} title={r.title} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "primary",
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "accent";
}) {
  return (
    <Card className="p-5">
      <span
        className={
          tone === "accent"
            ? "flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent-dark"
            : "flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"
        }
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-0.5 font-display text-xl text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
    </Card>
  );
}

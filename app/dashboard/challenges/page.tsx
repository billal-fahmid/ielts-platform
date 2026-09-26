import Link from "next/link";
import { CheckCircle2, Trophy } from "lucide-react";
import { auth } from "@/lib/auth";
import { challengeProgress, completeChallenges, leaderboard, type LeaderboardScope } from "@/lib/services/challenges";
import { ACTIVITY_POINTS } from "@/lib/growth/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { PrivacyChoice } from "@/components/growth/controls";
import { cn } from "@/lib/utils";

export const metadata = { title: "Challenges — BanglaEnglish" };

const SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: "WEEK", label: "This week" },
  { key: "MONTH", label: "This month" },
  { key: "ALL", label: "All time" },
];

export default async function ChallengesPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { scope: rawScope } = await searchParams;
  const session = await auth();
  const user = session!.user as any;
  const scope = (SCOPES.find((s) => s.key === rawScope)?.key ?? "WEEK") as LeaderboardScope;
  const isStudent = user.role === "STUDENT";

  // Anything finished since the last visit is paid out now (once), then the page shows the up-to-date state.
  const newly = isStudent ? completeChallenges(user.id) : [];
  const challenges = challengeProgress(user.id);
  const board = leaderboard(user.id, scope);

  const section = (kind: "WEEK" | "MONTH", title: string) => {
    const list = challenges.filter((c) => c.period.kind === kind);
    if (list.length === 0) return null;
    return (
      <section className="flex flex-col gap-3" key={kind}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg text-ink">{title}</h2>
          <span className="text-xs text-ink-soft">{list[0].period.label}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((c) => (
            <Card key={c.key} className="p-4" data-testid="challenge" data-done={c.done || undefined}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{c.title}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{c.description}</p>
                </div>
                {c.done ? (
                  <Badge tone="success">
                    <CheckCircle2 className="h-3 w-3" /> Done
                  </Badge>
                ) : (
                  <Badge tone="accent">+{c.rewardXp} XP</Badge>
                )}
              </div>
              <ProgressBar value={(c.value / c.target) * 100} className="mt-3" barClassName={c.done ? "bg-success" : undefined} />
              <p className="mt-1.5 text-xs text-ink-soft">
                {c.value} / {c.target}
              </p>
            </Card>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Challenges and leaderboard</h1>
        <p className="mt-1 text-sm text-ink-soft">Weekly and monthly goals that pay XP, and a leaderboard of learners. Weeks run Monday to Sunday and reset at midnight Bangladesh time.</p>
      </div>

      {newly.length > 0 && (
        <Card className="border-success/40 bg-success-soft/40 p-4 text-sm text-ink" data-testid="newly-done">
          <p className="font-medium">
            <Trophy className="mr-1.5 inline h-4 w-4 text-success" /> Well done! You finished {newly.map((n) => n.title).join(" and ")} and earned {newly.reduce((s, n) => s + n.rewardXp, 0)} XP.
          </p>
        </Card>
      )}

      {section("WEEK", "This week")}
      {section("MONTH", "This month")}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink">Leaderboard</h2>
        <div className="flex flex-wrap gap-2" aria-label="Leaderboard period">
          {SCOPES.map((s) => (
            <Link key={s.key} href={`/dashboard/challenges?scope=${s.key}`} className={cn("rounded-full border px-3 py-1 text-xs font-medium", scope === s.key ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft hover:text-ink")}>
              {s.label}
            </Link>
          ))}
        </div>
        <Card className="p-0" data-testid="leaderboard">
          {board.rows.length === 0 ? (
            <p className="p-5 text-sm text-ink-soft">Nobody has earned points {scope === "ALL" ? "yet" : "in this period yet"}. Finish a lesson or a quiz to get on the board.</p>
          ) : (
            <ol className="divide-y divide-border">
              {board.rows.map((r) => (
                <li key={r.rank + r.label} className={cn("flex items-center justify-between gap-3 px-4 py-3 text-sm", r.isYou && "bg-primary-soft/50")} data-you={r.isYou || undefined}>
                  <span className="flex items-center gap-3">
                    <span className="w-6 text-right font-display text-base text-ink-soft">{r.rank}</span>
                    <span className="font-medium text-ink">
                      {r.label}
                      {r.isYou && <span className="ml-2 text-xs font-normal text-primary">You</span>}
                    </span>
                  </span>
                  <span className="text-ink-soft">{r.points} pts</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        {board.you && !board.rows.some((r) => r.isYou) && (
          <p className="text-sm text-ink-soft" data-testid="your-rank">
            {board.you.listed ? `You're ranked #${board.you.rank} with ${board.you.points} points.` : `You're hidden from the public list. You would be ranked #${board.you.rank} with ${board.you.points} points.`}
          </p>
        )}
        {!board.you && isStudent && <p className="text-sm text-ink-soft">You haven&apos;t earned any points {scope === "ALL" ? "yet" : "in this period yet"}.</p>}
        <p className="text-xs text-ink-soft">
          Points: lesson {ACTIVITY_POINTS.lesson}, quiz {ACTIVITY_POINTS.quiz}, IELTS reading or listening {ACTIVITY_POINTS.practice}, essay {ACTIVITY_POINTS.writing}, speaking session {ACTIVITY_POINTS.speaking}, mock test {ACTIVITY_POINTS.mock}. Only students are ranked.
        </p>
      </section>

      {isStudent && (
        <Card className="p-5" data-testid="privacy">
          <PrivacyChoice current={board.visibility} />
        </Card>
      )}
    </div>
  );
}

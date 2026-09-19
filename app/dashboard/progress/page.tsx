import { auth } from "@/lib/auth";
import { countCompletedLessons } from "@/lib/services/courses";
import { countLearnedWords } from "@/lib/services/vocabulary";
import { recentAttempts, latestAssessmentResult } from "@/lib/services/quiz";
import { listUserBadges } from "@/lib/services/gamification";
import { getProfile } from "@/lib/services/users";
import { db } from "@/lib/db";
import { lessons, quizAttempts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, Flame, Award } from "lucide-react";
import { ProgressCharts } from "./charts";
import * as LucideIcons from "lucide-react";

export default async function ProgressPage() {
  const session = await auth();
  const userId = (session!.user as any).id;

  const profile = getProfile(userId);
  const completedLessons = countCompletedLessons(userId);
  const totalLessons = db.select().from(lessons).all().length;
  const learnedWords = countLearnedWords(userId);
  const attempts = db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId)).all();
  const badges = listUserBadges(userId);
  const assessment = latestAssessmentResult(userId);

  const quizChartData = attempts
    .slice(-10)
    .map((a, i) => ({
      name: `#${i + 1}`,
      score: a.totalQuestions ? Math.round((a.score / a.totalQuestions) * 100) : 0,
    }));

  const skillData = assessment
    ? [
        { name: "Grammar", value: Math.round(assessment.grammarScore) },
        { name: "Vocabulary", value: Math.round(assessment.vocabularyScore) },
        { name: "Reading", value: Math.round(assessment.readingScore) },
        { name: "Listening", value: Math.round(assessment.listeningScore) },
      ]
    : [];

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Your Progress</h1>
      <p className="mt-1 text-sm text-ink-soft">A full picture of how your English is developing.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Lessons completed" value={`${completedLessons}/${totalLessons}`} />
        <StatCard icon={Sparkles} label="Words learned" value={String(learnedWords)} />
        <StatCard icon={Flame} label="Current streak" value={`${profile?.streak ?? 0} days`} />
        <StatCard icon={Award} label="Badges earned" value={String(badges.length)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">Quiz performance</h2>
          <p className="text-xs text-ink-soft">Your last {quizChartData.length} quiz attempts</p>
          <ProgressCharts type="line" data={quizChartData} />
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">Skill progress</h2>
          <p className="text-xs text-ink-soft">From your latest placement assessment</p>
          {skillData.length > 0 ? (
            <ProgressCharts type="bar" data={skillData.map((s) => ({ name: s.name, score: s.value }))} />
          ) : (
            <p className="mt-6 text-sm text-ink-soft">Take the placement assessment to see this chart.</p>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg text-ink">Badges</h2>
        {badges.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Complete lessons and quizzes to start earning badges.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {badges.map(({ badge, earnedAt }) => {
              const Icon = (LucideIcons as any)[badge.icon] ?? Award;
              return (
                <div key={badge.id} className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent-dark">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-medium text-ink">{badge.title}</p>
                  <Badge tone="neutral">{badge.description}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-0.5 font-display text-xl text-ink">{value}</p>
    </Card>
  );
}

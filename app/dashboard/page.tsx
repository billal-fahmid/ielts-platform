import Link from "next/link";
import { auth } from "@/lib/auth";
import { getProfile } from "@/lib/services/users";
import { recommendedLessons, countCompletedLessons } from "@/lib/services/courses";
import { recentAttempts } from "@/lib/services/quiz";
import { dailyVocabulary, countLearnedWords } from "@/lib/services/vocabulary";
import { db } from "@/lib/db";
import { lessons, modules, courses, quizzes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { LinkButton } from "@/components/ui/button";
import { LEVEL_LABELS } from "@/lib/utils";
import {
  Target,
  Flame,
  BookOpen,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";

export default async function DashboardOverviewPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const profile = getProfile(userId);

  const totalLessons = db.select().from(lessons).all().length;
  const completed = countCompletedLessons(userId);
  const overallPct = totalLessons ? Math.round((completed / totalLessons) * 100) : 0;

  const recs = recommendedLessons(userId, 4).map((l) => {
    const mod = db.select().from(modules).where(eq(modules.id, l.moduleId)).get();
    const course = mod ? db.select().from(courses).where(eq(courses.id, mod.courseId)).get() : null;
    return { lesson: l, course, module: mod };
  });

  const attempts = recentAttempts(userId, 4);
  const todaysVocab = dailyVocabulary(userId, 5);
  const learnedWords = countLearnedWords(userId);

  const firstName = session!.user!.name?.split(" ")[0] ?? "there";

  if (!profile?.englishLevel) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <ClipboardCheck className="h-8 w-8 text-primary" />
        <h2 className="font-display text-xl text-ink">Take your placement assessment</h2>
        <p className="max-w-sm text-sm text-ink-soft">
          Answer a few grammar, vocabulary, reading, and listening questions so we can
          build your personalized dashboard.
        </p>
        <LinkButton href="/dashboard/assessment" size="lg">
          Start Assessment <ArrowRight className="h-4 w-4" />
        </LinkButton>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-ink">Welcome back, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-ink-soft">Here's where your English learning stands today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Target} label="Current level" value={profile.englishLevel} sub={LEVEL_LABELS[profile.englishLevel as keyof typeof LEVEL_LABELS]} />
        <StatCard icon={ClipboardCheck} label="IELTS target" value={`Band ${profile.ieltsTarget?.toFixed(1) ?? "—"}`} sub={profile.targetExamDate ? `Exam: ${profile.targetExamDate}` : undefined} />
        <StatCard icon={Flame} label="Study streak" value={`${profile.streak} days`} sub="Keep it going!" />
        <StatCard icon={Sparkles} label="Words learned" value={String(learnedWords)} sub="Total vocabulary" />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Today's progress</h2>
          <span className="text-sm font-medium text-primary">{overallPct}%</span>
        </div>
        <ProgressBar value={overallPct} className="mt-3" />
        <p className="mt-2 text-xs text-ink-soft">
          {completed} of {totalLessons} lessons completed across all courses
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Continue learning</h2>
            <Link href="/dashboard/courses" className="text-sm font-medium text-primary">
              All courses →
            </Link>
          </div>
          <div className="mt-4 flex flex-col divide-y divide-border">
            {recs.length === 0 && <p className="py-6 text-sm text-ink-soft">You've completed every lesson — nice work!</p>}
            {recs.map(({ lesson, course, module }) => (
              <Link
                key={lesson.id}
                href={course ? `/dashboard/courses/${course.slug}/${lesson.slug}` : "#"}
                className="flex items-center gap-3 py-3.5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{lesson.title}</p>
                  <p className="text-xs text-ink-soft">
                    {course?.title} · {module?.title}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-soft" />
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">Daily vocabulary</h2>
          <div className="mt-4 flex flex-col gap-3">
            {todaysVocab.map((v) => (
              <div key={v.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-ink">{v.word}</p>
                <p className="text-xs text-ink-soft">{v.meaning}</p>
                {v.banglaMeaning && <p className="text-xs text-primary">{v.banglaMeaning}</p>}
              </div>
            ))}
            {todaysVocab.length === 0 && <p className="text-sm text-ink-soft">All caught up for today!</p>}
          </div>
          <LinkButton href="/dashboard/vocabulary" variant="outline" className="mt-4 w-full">
            Review vocabulary
          </LinkButton>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-display text-lg text-ink">Recent quiz scores</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {attempts.map((a) => {
            const pct = a.totalQuestions ? Math.round((a.score / a.totalQuestions) * 100) : 0;
            return (
              <div key={a.id} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <CheckCircle2 className={pct >= 60 ? "h-4 w-4 text-success" : "h-4 w-4 text-danger"} />
                  <Badge tone={pct >= 60 ? "success" : "danger"}>{pct}%</Badge>
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  {a.score} / {a.totalQuestions} correct
                </p>
              </div>
            );
          })}
          {attempts.length === 0 && <p className="text-sm text-ink-soft">No quizzes taken yet — start a lesson!</p>}
        </div>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-0.5 font-display text-xl text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
    </Card>
  );
}

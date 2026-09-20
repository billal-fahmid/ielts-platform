import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getCourseFullTree, isLessonCompleted, getUserProgressForCourse } from "@/lib/services/courses";
import { isEnrolled, getEnrollment } from "@/lib/services/enrollment";
import { EnrollButton } from "@/components/courses/enroll-button";
import { TRACK_LABELS, trackTone } from "@/lib/courses/tracks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { CheckCircle2, Circle, PlayCircle, Lock } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { getEntitlements, canAccessCourse, getPlanByCode } from "@/lib/services/plans";

export default async function DashboardCourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;

  const course = getCourseFullTree(slug);
  if (!course) notFound();

  const progress = getUserProgressForCourse(userId, course.id);
  const enrolled = isEnrolled(userId, course.id);
  const ent = getEntitlements(userId);
  const locked = !canAccessCourse(ent, course);
  const requiredPlan = getPlanByCode(course.requiredPlan);
  const completedOn = getEnrollment(userId, course.id)?.completedAt;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-2">
        <Badge tone={trackTone(course.track)}>{TRACK_LABELS[course.track]}</Badge>
        <Badge tone="neutral">{course.category}</Badge>
      </div>
      <h1 className="mt-3 font-display text-2xl text-ink">{course.title}</h1>
      <p className="mt-1.5 text-sm text-ink-soft">{course.description}</p>
      <div className="mt-4">
        {locked ? (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface p-4" data-testid="course-locked">
            <p className="flex items-center gap-2 text-sm font-medium text-ink">
              <Lock className="h-4 w-4 text-primary" /> Included from the {requiredPlan?.name ?? course.requiredPlan} plan
            </p>
            <p className="text-xs text-ink-soft">You&apos;re on the {ent.plan.name} plan.</p>
            <LinkButton href="/dashboard/billing" size="sm">
              See plans
            </LinkButton>
          </div>
        ) : (
          <EnrollButton courseId={course.id} courseSlug={course.slug} enrolled={enrolled} size="md" />
        )}
        {completedOn && <p className="mt-2 text-xs text-success">Completed on {new Date(completedOn).toLocaleDateString()}</p>}
      </div>

      <Card className="mt-5 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink-soft">Course progress</span>
          <span className="font-medium text-ink">{progress.percent}%</span>
        </div>
        <ProgressBar value={progress.percent} className="mt-2" />
      </Card>

      <div className="mt-6 flex flex-col gap-5">
        {course.modules.map((m, mi) => (
          <Card key={m.id} className="p-5">
            <h2 className="font-display text-lg text-ink">
              Module {mi + 1}: {m.title}
            </h2>
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {m.lessons.map((l) => {
                const done = isLessonCompleted(userId, l.id);
                return (
                  <li key={l.id}>
                    <Link
                      href={`/dashboard/courses/${course.slug}/${l.slug}`}
                      className="flex items-center gap-3 py-3 hover:opacity-80"
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-ink-soft/40" />
                      )}
                      <span className="flex-1 text-sm text-ink">{l.title}</span>
                      <span className="flex items-center gap-1 text-xs text-ink-soft">
                        <PlayCircle className="h-3.5 w-3.5" /> {l.xpReward} XP
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}

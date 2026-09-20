import Link from "next/link";
import { auth } from "@/lib/auth";
import { listCourses, getUserProgressForCourse } from "@/lib/services/courses";
import { listMyCourses } from "@/lib/services/enrollment";
import { TRACKS, TRACK_LABELS, trackTone, type Track } from "@/lib/courses/tracks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { getEntitlements, canAccessCourse, getPlanByCode } from "@/lib/services/plans";

export default async function DashboardCoursesPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const { track } = await searchParams;
  const active = TRACKS.includes(track as Track) ? (track as Track) : undefined;

  const session = await auth();
  const userId = (session!.user as any).id;

  const ent = getEntitlements(userId);
  const lockLabel = (c: { requiredPlan: string }) => (canAccessCourse(ent, c) ? null : getPlanByCode(c.requiredPlan)?.name ?? c.requiredPlan);
  const mine = listMyCourses(userId);
  const mineIds = new Set(mine.map((m) => m.course.id));
  const explore = listCourses(active).filter((c) => !mineIds.has(c.id));
  const myFiltered = active ? mine.filter((m) => m.course.track === active) : mine;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-ink">Courses</h1>
        <p className="mt-1 text-sm text-ink-soft">Pick up where you left off or start something new.</p>
      </div>

      <nav aria-label="Course track" className="flex flex-wrap gap-2">
        {[undefined, ...TRACKS].map((t) => (
          <Link
            key={t ?? "all"}
            href={t ? `/dashboard/courses?track=${t}` : "/dashboard/courses"}
            aria-current={active === t ? "page" : undefined}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", active === t ? "border-primary bg-primary text-white" : "border-border text-ink-soft hover:text-ink")}
          >
            {t ? TRACK_LABELS[t] : "All"}
          </Link>
        ))}
      </nav>

      {myFiltered.length > 0 && (
        <section aria-labelledby="my-courses">
          <h2 id="my-courses" className="font-display text-lg text-ink">
            My courses
          </h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {myFiltered.map(({ course: c, progress, enrollment }) => (
              <Link key={c.id} href={`/dashboard/courses/${c.slug}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-2">
                    <Badge tone={trackTone(c.track)}>{TRACK_LABELS[c.track]}</Badge>
                    {enrollment.status === "COMPLETED" ? <Badge tone="success">Completed</Badge> : <Badge tone="neutral">{c.category}</Badge>}
                  </div>
                  <h3 className="mt-3 font-display text-lg text-ink">{c.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{c.description}</p>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-ink-soft">
                      <span>Progress</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <ProgressBar value={progress.percent} className="mt-1.5" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="explore-courses">
        <h2 id="explore-courses" className="font-display text-lg text-ink">
          {myFiltered.length > 0 ? "Explore more courses" : "All courses"}
        </h2>
        {explore.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">{active ? "No other courses in this track yet." : "You're enrolled in every course. Great work!"}</p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {explore.map((c) => {
              const progress = getUserProgressForCourse(userId, c.id);
              return (
                <Link key={c.id} href={`/dashboard/courses/${c.slug}`}>
                  <Card className="h-full p-5 transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-2">
                      <Badge tone={trackTone(c.track)}>{TRACK_LABELS[c.track]}</Badge>
                      <Badge tone="neutral">{c.category}</Badge>
                      {lockLabel(c) && (
                        <Badge tone="accent">
                          <Lock className="h-3 w-3" /> {lockLabel(c)}
                        </Badge>
                      )}
                    </div>
                    <h3 className="mt-3 font-display text-lg text-ink">{c.title}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{c.description}</p>
                    <p className="mt-4 text-xs text-ink-soft">
                      {progress.total} lessons · {lockLabel(c) ? `Included from ${lockLabel(c)}` : "Not enrolled"}
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

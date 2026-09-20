import { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listCourses } from "@/lib/services/courses";
import { TRACKS, TRACK_LABELS, trackTone, type Track } from "@/lib/courses/tracks";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Courses — BanglaEnglish",
  description: "Structured English, IELTS and career English courses with short lessons and quizzes.",
};

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const { track } = await searchParams;
  const active = TRACKS.includes(track as Track) ? (track as Track) : undefined;
  const courses = listCourses(active);

  return (
    <div>
      <section className="border-b border-border bg-surface py-16">
        <div className="container-page max-w-2xl">
          <p className="text-sm font-medium text-primary">Courses</p>
          <h1 className="mt-1.5 font-display text-3xl text-ink sm:text-4xl">Every course, from Beginner to Career English</h1>
          <p className="mt-4 text-base text-ink-soft">
            Structured English, IELTS and workplace English courses, each broken into modules and short, focused lessons with quizzes to check your understanding.
          </p>
        </div>
      </section>

      <section className="container-page py-10">
        <nav aria-label="Course track" className="flex flex-wrap gap-2">
          {[undefined, ...TRACKS].map((t) => (
            <Link
              key={t ?? "all"}
              href={t ? `/courses?track=${t}` : "/courses"}
              aria-current={active === t ? "page" : undefined}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium",
                active === t ? "border-primary bg-primary text-white" : "border-border text-ink-soft hover:text-ink"
              )}
            >
              {t ? TRACK_LABELS[t] : "All courses"}
            </Link>
          ))}
        </nav>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.slug}`}>
              <Card className="h-full p-6 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2">
                  <Badge tone={trackTone(c.track)}>{TRACK_LABELS[c.track]}</Badge>
                  <Badge tone="neutral">{c.category}</Badge>
                </div>
                <h2 className="mt-4 font-display text-xl text-ink">{c.title}</h2>
                <p className="mt-2 text-sm text-ink-soft">{c.description}</p>
                <p className="mt-5 text-sm font-medium text-primary">View course →</p>
              </Card>
            </Link>
          ))}
        </div>
        {courses.length === 0 && <p className="mt-8 text-sm text-ink-soft">No courses in this track yet.</p>}
      </section>
    </div>
  );
}

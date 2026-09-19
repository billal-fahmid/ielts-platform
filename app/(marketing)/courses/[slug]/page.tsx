import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourseFullTree } from "@/lib/services/courses";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { BookOpen, PlayCircle, Lock } from "lucide-react";

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = getCourseFullTree(slug);
  if (!course) notFound();

  const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div>
      <section className="border-b border-border bg-surface py-14">
        <div className="container-page max-w-2xl">
          <div className="flex items-center gap-2">
            <Badge tone={course.track === "IELTS" ? "accent" : "primary"}>{course.track}</Badge>
            <Badge tone="neutral">{course.category}</Badge>
          </div>
          <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">{course.title}</h1>
          <p className="mt-3 text-base text-ink-soft">{course.description}</p>
          <p className="mt-4 text-sm text-ink-soft">
            {course.modules.length} modules · {totalLessons} lessons
          </p>
          <div className="mt-6">
            <LinkButton href="/register" size="lg">
              Enroll for free
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <h2 className="font-display text-2xl text-ink">Curriculum</h2>
        <div className="mt-6 flex flex-col gap-5">
          {course.modules.map((m, mi) => (
            <Card key={m.id} className="p-5">
              <h3 className="font-display text-lg text-ink">
                Module {mi + 1}: {m.title}
              </h3>
              <ul className="mt-3 flex flex-col divide-y divide-border">
                {m.lessons.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <PlayCircle className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 text-ink">{l.title}</span>
                    <span className="flex items-center gap-1 text-xs text-ink-soft">
                      <Lock className="h-3 w-3" /> Sign in
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      <section className="container-page pb-16">
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <BookOpen className="h-8 w-8 text-primary" />
          <h2 className="font-display text-xl text-ink">Ready to start "{course.title}"?</h2>
          <LinkButton href="/register" size="lg">
            Create a free account
          </LinkButton>
        </Card>
      </section>
    </div>
  );
}

import { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listCourses } from "@/lib/services/courses";

export const metadata: Metadata = { title: "Courses — BanglaEnglish" };

export default function CoursesPage() {
  const courses = listCourses();

  return (
    <div>
      <section className="border-b border-border bg-surface py-16">
        <div className="container-page max-w-2xl">
          <p className="text-sm font-medium text-primary">Courses</p>
          <h1 className="mt-1.5 font-display text-3xl text-ink sm:text-4xl">
            Every course, from Beginner to Advanced
          </h1>
          <p className="mt-4 text-base text-ink-soft">
            Structured English and IELTS courses, each broken into modules and short,
            focused lessons with quizzes to check your understanding.
          </p>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/courses/${c.slug}`}>
              <Card className="h-full p-6 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2">
                  <Badge tone={c.track === "IELTS" ? "accent" : "primary"}>{c.track}</Badge>
                  <Badge tone="neutral">{c.category}</Badge>
                </div>
                <h2 className="mt-4 font-display text-xl text-ink">{c.title}</h2>
                <p className="mt-2 text-sm text-ink-soft">{c.description}</p>
                <p className="mt-5 text-sm font-medium text-primary">View course →</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

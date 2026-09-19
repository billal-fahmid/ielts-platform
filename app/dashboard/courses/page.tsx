import Link from "next/link";
import { auth } from "@/lib/auth";
import { listCourses, getUserProgressForCourse } from "@/lib/services/courses";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";

export default async function DashboardCoursesPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const courses = listCourses();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Courses</h1>
      <p className="mt-1 text-sm text-ink-soft">Pick up where you left off or start something new.</p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => {
          const progress = getUserProgressForCourse(userId, c.id);
          return (
            <Link key={c.id} href={`/dashboard/courses/${c.slug}`}>
              <Card className="h-full p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-2">
                  <Badge tone={c.track === "IELTS" ? "accent" : "primary"}>{c.track}</Badge>
                  <Badge tone="neutral">{c.category}</Badge>
                </div>
                <h2 className="mt-3 font-display text-lg text-ink">{c.title}</h2>
                <p className="mt-1.5 text-sm text-ink-soft line-clamp-2">{c.description}</p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-ink-soft">
                    <span>Progress</span>
                    <span>{progress.percent}%</span>
                  </div>
                  <ProgressBar value={progress.percent} className="mt-1.5" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

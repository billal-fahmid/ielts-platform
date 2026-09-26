import { db } from "@/lib/db";
import { users, courses, lessons, vocabulary, quizAttempts, badges as badgesTable } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { Users, BookOpen, Layers, Sparkles, ClipboardList, Award, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function AdminOverviewPage() {
  const userCount = db.select().from(users).all().length;
  const courseCount = db.select().from(courses).all().length;
  const lessonCount = db.select().from(lessons).all().length;
  const vocabCount = db.select().from(vocabulary).all().length;
  const attemptCount = db.select().from(quizAttempts).all().length;
  const badgeCount = db.select().from(badgesTable).all().length;

  const stats = [
    { icon: BarChart3, label: "Analytics", value: "Charts and trends", href: "/admin/analytics" },
    { icon: Users, label: "Users", value: userCount, href: "/admin/users" },
    { icon: BookOpen, label: "Courses", value: courseCount, href: "/admin/courses" },
    { icon: Layers, label: "Lessons", value: lessonCount, href: "/admin/lessons" },
    { icon: Sparkles, label: "Vocabulary words", value: vocabCount, href: "/admin/vocabulary" },
    { icon: ClipboardList, label: "Quiz attempts", value: attemptCount, href: "/admin/questions" },
    { icon: Award, label: "Badges", value: badgeCount, href: "/admin/badges" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Admin Overview</h1>
      <p className="mt-1 text-sm text-ink-soft">Manage every part of the platform's content.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="p-5 transition-shadow hover:shadow-md">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <s.icon className="h-4.5 w-4.5" />
              </span>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-soft">{s.label}</p>
              <p className="mt-0.5 font-display text-2xl text-ink">{s.value}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

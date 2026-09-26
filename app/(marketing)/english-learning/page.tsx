import { pageMetadata } from "@/lib/seo";
import { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Sparkles, PenLine, Headphones, Mic, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { listCourses } from "@/lib/services/courses";

export const metadata: Metadata = pageMetadata({ title: "English Learning — BanglaEnglish", description: "Grammar, vocabulary, speaking and career English courses for learners in Bangladesh, from beginner to advanced.", path: "/english-learning" });

export default function EnglishLearningPage() {
  const courses = listCourses("ENGLISH");

  return (
    <div>
      <section className="border-b border-border bg-surface py-16">
        <div className="container-page max-w-2xl">
          <Badge tone="primary">English Learning</Badge>
          <h1 className="mt-3 font-display text-3xl text-ink sm:text-4xl">
            From your first sentence to fluent, everyday English
          </h1>
          <p className="mt-4 text-base text-ink-soft">
            Four levels, real vocabulary, and an interactive Grammar Lab — everything you
            need to build genuine English confidence, at your own pace.
          </p>
          <div className="mt-6">
            <LinkButton href="/register" size="lg">
              Take the placement test <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="font-display text-2xl text-ink">Learning tools built for every skill</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BookOpen, title: "Structured Courses", desc: "Beginner to Advanced, organized into modules and bite-sized lessons." },
            { icon: Sparkles, title: "Grammar Lab", desc: "10 core grammar topics with explanations, examples, and practice quizzes." },
            { icon: PenLine, title: "Vocabulary & Flashcards", desc: "Daily words with Bangla meanings, spaced-repetition flashcards." },
            { icon: Headphones, title: "Progress Tracking", desc: "XP, streaks, and badges that keep you coming back every day." },
          ].map((f) => (
            <Card key={f.title} className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg text-ink">{f.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface py-16">
        <div className="container-page">
          <h2 className="font-display text-2xl text-ink">Courses by level</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((c) => (
              <Link key={c.id} href={`/courses/${c.slug}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <Badge tone="primary">{c.category}</Badge>
                  <h3 className="mt-3 font-display text-lg text-ink">{c.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-soft line-clamp-2">{c.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

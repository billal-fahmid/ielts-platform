import { pageMetadata } from "@/lib/seo";
import { Metadata } from "next";
import { Target, Users, BookOpen, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = pageMetadata({ title: "About — BanglaEnglish", description: "Our mission: make world-class English and IELTS preparation accessible to every student in Bangladesh.", path: "/about" });

export default function AboutPage() {
  return (
    <div>
      <section className="border-b border-border bg-surface py-16">
        <div className="container-page max-w-2xl">
          <p className="text-sm font-medium text-primary">About us</p>
          <h1 className="mt-1.5 font-display text-3xl text-ink sm:text-4xl">
            Built in Bangladesh, for Bangladeshi learners
          </h1>
          <p className="mt-4 text-base text-ink-soft">
            BanglaEnglish started with a simple observation: talented students across
            Bangladesh were held back not by ability, but by access to structured,
            affordable English and IELTS preparation. We set out to fix that — one
            lesson, one quiz, one vocabulary word at a time.
          </p>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Target, title: "Our mission", desc: "Make world-class English and IELTS prep accessible to every student in Bangladesh." },
            { icon: Users, title: "Our students", desc: "Learners from complete beginners to IELTS candidates, studying at their own pace from anywhere in Bangladesh." },
            { icon: BookOpen, title: "Our method", desc: "Structured courses, spaced-repetition vocabulary, and real exam-style practice." },
            { icon: Heart, title: "Our values", desc: "Clarity over jargon, consistency over cramming, and encouragement over pressure." },
          ].map((v) => (
            <Card key={v.title} className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg text-ink">{v.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{v.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface py-16">
        <div className="container-page grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl text-ink">How we got here</h2>
            <p className="mt-3 text-sm text-ink-soft">
              After years of tutoring students privately for IELTS, our founding team saw
              the same gaps come up again and again: inconsistent grammar foundations, thin
              vocabulary, and little exposure to real exam conditions. BanglaEnglish
              packages that tutoring experience into a platform anyone can use — starting
              with a free placement test and a path built around your actual level.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl text-ink">Where we're headed</h2>
            <p className="mt-3 text-sm text-ink-soft">
              Milestone 1 focuses on the learning core: courses, grammar, vocabulary,
              quizzes, and progress tracking. Upcoming milestones will add an AI
              conversation partner, full-length mock IELTS tests, and live teacher
              sessions — all building on the same foundation you're using today.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-16 text-center">
        <h2 className="font-display text-2xl text-ink">Join thousands of learners today</h2>
        <div className="mt-5">
          <LinkButton href="/register" size="lg">
            Start Free Assessment
          </LinkButton>
        </div>
      </section>
    </div>
  );
}

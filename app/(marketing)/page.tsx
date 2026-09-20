import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Headphones,
  PenLine,
  Mic,
  Sparkles,
  Users,
  Star,
  CheckCircle2,
  Target,
  TrendingUp,
  Award,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { TRACK_LABELS, trackTone } from "@/lib/courses/tracks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BandDial } from "@/components/marketing/band-dial";
import { listCourses } from "@/lib/services/courses";
import { listTeachers, listTestimonials } from "@/lib/services/marketing";

export default function HomePage() {
  const courses = listCourses().slice(0, 4);
  const teachers = listTeachers().slice(0, 4);
  const testimonials = listTestimonials();

  return (
    <div>
      {/* HERO */}
      <section className="border-b border-border bg-surface">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <Badge tone="accent">Built for learners in Bangladesh</Badge>
            <h1 className="mt-4 max-w-lg font-display text-4xl leading-[1.1] text-ink sm:text-5xl">
              Improve your English. Achieve your IELTS goal.
            </h1>
            <p className="mt-5 max-w-md text-base text-ink-soft">
              Structured lessons, a smart placement test, and real IELTS practice — all in
              one platform that tracks your progress from your first sentence to Band 9.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <LinkButton href="/register" size="lg">
                Start Free Assessment <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton href="/ielts-preparation" size="lg" variant="outline">
                Explore IELTS Prep
              </LinkButton>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-ink-soft">
              <Stat value="12,000+" label="students" />
              <Stat value="4.8/5" label="average rating" />
              <Stat value="6" label="skill-focused courses" />
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="relative flex items-center justify-center rounded-3xl border border-border bg-bg p-10">
              <BandDial value={7} />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container-page py-16">
        <SectionHeading eyebrow="English Learning" title="Learn every skill, step by step" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BookOpen, title: "Grammar", desc: "Master the rules with clear, practical explanations." },
            { icon: Sparkles, title: "Vocabulary", desc: "Build your word bank with spaced-repetition flashcards." },
            { icon: PenLine, title: "Writing", desc: "From simple sentences to structured essays." },
            { icon: Headphones, title: "Listening", desc: "Train your ear with real-world audio practice." },
          ].map((c) => (
            <Card key={c.title} className="p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <c.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg text-ink">{c.title}</h3>
              <p className="mt-1 text-sm text-ink-soft">{c.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* IELTS MODULES */}
      <section className="border-y border-border bg-surface py-16">
        <div className="container-page">
          <SectionHeading eyebrow="IELTS Preparation" title="Practice all four IELTS modules" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: PenLine, title: "Writing", desc: "Task 1 reports and Task 2 essays with model answers." },
              { icon: Mic, title: "Speaking", desc: "All three parts, from intro questions to a 2-minute talk." },
              { icon: Headphones, title: "Listening", desc: "Realistic audio drills with instant scoring." },
              { icon: BookOpen, title: "Reading", desc: "Timed passages that build exam-day stamina." },
            ].map((m) => (
              <Card key={m.title} className="p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent-dark">
                  <m.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg text-ink">{m.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{m.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI TEASER */}
      <section className="container-page py-16">
        <Card className="grid gap-8 overflow-hidden p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-12">
          <div>
            <Badge tone="primary">Coming in Milestone 2</Badge>
            <h2 className="mt-3 font-display text-2xl text-ink sm:text-3xl">
              An AI conversation partner, built into every lesson
            </h2>
            <p className="mt-2 max-w-lg text-sm text-ink-soft">
              Practice speaking and writing with instant, personalized feedback — arriving
              in the next milestone of the platform.
            </p>
          </div>
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
            <Sparkles className="h-7 w-7" />
          </span>
        </Card>
      </section>

      {/* POPULAR COURSES */}
      <section className="border-t border-border bg-surface py-16">
        <div className="container-page">
          <div className="flex items-end justify-between">
            <SectionHeading eyebrow="Courses" title="Popular courses" />
            <Link href="/courses" className="hidden shrink-0 text-sm font-medium text-primary sm:block">
              View all courses →
            </Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((c) => (
              <Link key={c.id} href={`/courses/${c.slug}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <Badge tone={trackTone(c.track)}>{TRACK_LABELS[c.track]}</Badge>
                  <h3 className="mt-3 font-display text-lg text-ink">{c.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-soft line-clamp-2">{c.description}</p>
                  <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-soft">
                    {c.category}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="container-page py-16">
        <div className="grid gap-6 rounded-2xl border border-border bg-primary-dark p-10 text-white sm:grid-cols-3">
          <StatBlock icon={Users} value="12,000+" label="Active students" />
          <StatBlock icon={TrendingUp} value="1.2 avg" label="Band score improvement" />
          <StatBlock icon={Award} value="94%" label="Course completion rate" />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-y border-border bg-surface py-16">
        <div className="container-page">
          <SectionHeading eyebrow="Student stories" title="What our students say" />
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.id} className="p-5">
                <div className="flex gap-0.5 text-accent">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-sm text-ink">"{t.quote}"</p>
                <div className="mt-4">
                  <p className="text-sm font-medium text-ink">{t.name}</p>
                  <p className="text-xs text-ink-soft">{t.role}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TEACHERS */}
      <section className="container-page py-16">
        <div className="flex items-end justify-between">
          <SectionHeading eyebrow="Meet your coaches" title="Learn from experienced teachers" />
          <Link href="/teachers" className="hidden shrink-0 text-sm font-medium text-primary sm:block">
            All teachers →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {teachers.map((t) => (
            <Card key={t.id} className="p-5 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft font-display text-xl text-primary">
                {t.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <h3 className="mt-3 font-display text-base text-ink">{t.name}</h3>
              <p className="text-xs text-ink-soft">{t.title}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="border-t border-border bg-surface py-16">
        <div className="container-page text-center">
          <SectionHeading eyebrow="Pricing" title="Start free, upgrade anytime" center />
          <div className="mt-4">
            <LinkButton href="/pricing" size="lg">
              See pricing plans <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-16">
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            { q: "Is BanglaEnglish free to start?", a: "Yes — you can register, complete the placement test, and access beginner content for free." },
            { q: "Do I need to know my English level already?", a: "No. Our placement assessment estimates your level (A1–C1) automatically after a short test." },
            { q: "Can I study on mobile?", a: "Yes, the entire platform is mobile-first and works on any modern browser." },
            { q: "How is my IELTS band score estimated?", a: "We combine your assessment results, quiz performance, and mock test scores." },
          ].map((f) => (
            <Card key={f.q} className="p-5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-ink">{f.q}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{f.a}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="container-page pb-20">
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <Target className="h-8 w-8 text-primary" />
          <h2 className="font-display text-2xl text-ink">Ready to find your English level?</h2>
          <p className="max-w-md text-sm text-ink-soft">
            Take the free placement assessment and get a personalized learning path in minutes.
          </p>
          <LinkButton href="/register" size="lg">
            Start Free Assessment <ArrowRight className="h-4 w-4" />
          </LinkButton>
        </Card>
      </section>
    </div>
  );
}

function SectionHeading({ eyebrow, title, center }: { eyebrow: string; title: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-lg" : ""}>
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="mt-1.5 font-display text-2xl text-ink sm:text-3xl">{title}</h2>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <span className="font-mono font-medium text-ink">{value}</span> <span>{label}</span>
    </div>
  );
}

function StatBlock({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-display text-2xl">{value}</p>
        <p className="text-sm text-white/70">{label}</p>
      </div>
    </div>
  );
}

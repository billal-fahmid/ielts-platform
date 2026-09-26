import { pageMetadata } from "@/lib/seo";
import { Metadata } from "next";
import Link from "next/link";
import { PenLine, Mic, Headphones, BookOpen, ArrowRight, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { BandDial } from "@/components/marketing/band-dial";
import { listCourses } from "@/lib/services/courses";

export const metadata: Metadata = pageMetadata({ title: "IELTS Preparation — BanglaEnglish", description: "IELTS Listening, Reading, Writing and Speaking practice, full mock tests and AI feedback, with estimated band scores.", path: "/ielts-preparation" });

export default function IeltsPreparationPage() {
  const courses = listCourses("IELTS");

  return (
    <div>
      <section className="border-b border-border bg-surface">
        <div className="container-page grid gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <Badge tone="accent">IELTS Preparation</Badge>
            <h1 className="mt-3 max-w-lg font-display text-3xl text-ink sm:text-4xl">
              Practice-tested strategies for Band 7 and beyond
            </h1>
            <p className="mt-4 max-w-md text-base text-ink-soft">
              Targeted courses for Writing and Speaking, IELTS-specific vocabulary, and
              mock-test style questions across all four modules.
            </p>
            <div className="mt-6">
              <LinkButton href="/register" size="lg">
                Start your IELTS journey <ArrowRight className="h-4 w-4" />
              </LinkButton>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="rounded-3xl border border-border bg-bg p-8">
              <BandDial value={7.5} size={220} />
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <h2 className="font-display text-2xl text-ink">Every module, covered</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: PenLine, title: "Writing", desc: "Task 1 reports and Task 2 essays, with structure templates and model answers." },
            { icon: Mic, title: "Speaking", desc: "Part 1 intros, Part 2 cue cards, and Part 3 discussion practice." },
            { icon: Headphones, title: "Listening", desc: "Real-world audio scenarios with instant scoring and explanations." },
            { icon: BookOpen, title: "Reading", desc: "Timed passages that build the stamina exam day demands." },
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
      </section>

      <section className="border-t border-border bg-surface py-16">
        <div className="container-page">
          <h2 className="font-display text-2xl text-ink">IELTS-focused courses</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((c) => (
              <Link key={c.id} href={`/courses/${c.slug}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <Badge tone="accent">{c.category}</Badge>
                  <h3 className="mt-3 font-display text-lg text-ink">{c.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-soft line-clamp-2">{c.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Target className="h-8 w-8 text-primary" />
          <h2 className="font-display text-2xl text-ink">Not sure where to start?</h2>
          <p className="max-w-md text-sm text-ink-soft">
            Take the free placement assessment to see your current level and get a
            personalized path toward your target band.
          </p>
          <LinkButton href="/register" size="lg">
            Start Free Assessment
          </LinkButton>
        </Card>
      </section>
    </div>
  );
}

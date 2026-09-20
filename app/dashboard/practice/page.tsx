import { auth } from "@/lib/auth";
import { getEntitlements } from "@/lib/services/plans";
import { FEATURE_ROUTES } from "@/lib/plans/features";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Headphones, BookOpenCheck, PenLine, Mic, ClipboardCheck, Bot, Sparkles, Layers, Languages, CalendarCheck, ClipboardList, Lock } from "lucide-react";

export const metadata = { title: "Practice — BanglaEnglish" };

const GROUPS = [
  {
    title: "IELTS skills",
    items: [
      { href: "/dashboard/ielts/listening", label: "Listening", desc: "Audio tests with band estimates", icon: Headphones },
      { href: "/dashboard/ielts/reading", label: "Reading", desc: "Timed passages and question types", icon: BookOpenCheck },
      { href: "/dashboard/ielts/writing", label: "Writing", desc: "Essays with AI feedback", icon: PenLine },
      { href: "/dashboard/ielts/speaking", label: "Speaking", desc: "Practise with an AI examiner", icon: Mic },
      { href: "/dashboard/ielts/mock-test", label: "Mock tests", desc: "All four sections, on the clock", icon: ClipboardCheck },
      { href: "/dashboard/ielts/plan", label: "7-day plan", desc: "Practice built from your results", icon: CalendarCheck },
    ],
  },
  {
    title: "Everyday English",
    items: [
      { href: "/dashboard/tutor", label: "AI Tutor", desc: "Ask anything, in English or বাংলা", icon: Bot },
      { href: "/dashboard/vocabulary", label: "Vocabulary", desc: "Words with Bangla meanings", icon: Languages },
      { href: "/dashboard/flashcards", label: "Flashcards", desc: "Review words and remember them", icon: Sparkles },
      { href: "/dashboard/grammar", label: "Grammar Lab", desc: "Rules, examples and quizzes", icon: Layers },
      { href: "/dashboard/assessment", label: "Placement test", desc: "Find your English level", icon: ClipboardList },
    ],
  },
];

export default async function PracticeHubPage() {
  const session = await auth();
  const ent = getEntitlements((session!.user as any).id);
  const lockedPrefixes = FEATURE_ROUTES.filter((r) => !ent.features.has(r.feature)).map((r) => r.prefix);
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-ink">Practice</h1>
        <p className="mt-1 text-sm text-ink-soft">Pick a skill and start. Every band shown for practice is an estimate, not an official IELTS score.</p>
      </div>
      {GROUPS.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h2 className="font-display text-lg text-ink">{g.title}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((i) => (
              <Link key={i.href} href={i.href}>
                <Card className="flex h-full items-start gap-3 p-4 transition-colors hover:border-primary">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <i.icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      {i.label}
                      {lockedPrefixes.some((p) => i.href.startsWith(p)) && <Lock aria-label="Locked on your plan" className="h-3.5 w-3.5 text-ink-soft/70" />}
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">{i.desc}</span>
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

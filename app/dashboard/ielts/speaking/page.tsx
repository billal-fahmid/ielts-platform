import Link from "next/link";
import { auth } from "@/lib/auth";
import { listUserSessions, getEvaluation } from "@/lib/services/speaking";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Clock, Info } from "lucide-react";

const MODES = [
  { key: "full", title: "Full speaking test", blurb: "Part 1 interview, Part 2 cue card and Part 3 discussion, just like the real test.", minutes: "12–15 min" },
  { key: "part1", title: "Part 1 practice", blurb: "Short answers about familiar topics such as your hometown, work and free time.", minutes: "4–5 min" },
  { key: "part2", title: "Part 2 practice", blurb: "One cue card, one minute to prepare, then speak for up to two minutes.", minutes: "3–4 min" },
  { key: "part3", title: "Part 3 practice", blurb: "Deeper questions that ask for opinions, reasons and comparisons.", minutes: "5–6 min" },
];

const MODE_LABELS: Record<string, string> = {
  FULL_TEST: "Full test",
  PART1_PRACTICE: "Part 1",
  PART2_PRACTICE: "Part 2",
  PART3_PRACTICE: "Part 3",
};

export default async function SpeakingListPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const sessions = listUserSessions(userId, 8).map((s) => ({ ...s, evaluation: getEvaluation(s.id) }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-ink">IELTS Speaking</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Answer an examiner's questions out loud and get AI feedback on your fluency, vocabulary, grammar and delivery. Feedback is a practice estimate, not an official IELTS score.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-border bg-surface p-4 text-sm text-ink-soft">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Voice recording works best in Chrome or Edge with a microphone. Your browser turns your speech into text and the AI reviews that text and your timing — it doesn't hear your audio, so pronunciation feedback is a cautious estimate. Without a microphone you can type your answers instead.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {MODES.map((m) => (
          <Link key={m.key} href={`/dashboard/ielts/speaking/${m.key}`}>
            <Card className="flex h-full flex-col gap-3 p-5 transition-colors hover:border-primary">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Mic className="h-4.5 w-4.5" />
              </span>
              <h2 className="font-display text-lg text-ink">{m.title}</h2>
              <p className="text-sm text-ink-soft">{m.blurb}</p>
              <p className="mt-auto flex items-center gap-1 text-xs text-ink-soft">
                <Clock className="h-3.5 w-3.5" /> {m.minutes}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      {sessions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Your recent sessions</h2>
          <Card className="divide-y divide-border">
            {sessions.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/ielts/speaking/session/${s.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-primary-soft/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{MODE_LABELS[s.mode] ?? s.mode}{s.topic ? ` · ${s.topic}` : ""}</p>
                  <p className="text-xs text-ink-soft">{Math.max(1, Math.round(s.totalDurationSeconds / 60))} min</p>
                </div>
                {s.evaluation ? (
                  <Badge tone="primary">AI est. Band {s.evaluation.estimatedBand.toFixed(1)}</Badge>
                ) : (
                  <Badge tone="neutral">Feedback pending</Badge>
                )}
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}

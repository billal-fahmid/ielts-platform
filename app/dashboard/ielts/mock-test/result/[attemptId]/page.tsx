import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getMockSummary } from "@/lib/services/mock-test";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { LinkButton } from "@/components/ui/button";
import { FinalizeMock } from "@/components/ielts/finalize-mock";
import { Headphones, BookOpen, PenLine, Mic, ArrowRight } from "lucide-react";

function BandValue({ band }: { band: number | null }) {
  return <span className="font-display text-3xl text-primary">{band === null ? "—" : band.toFixed(1)}</span>;
}

export default async function MockTestResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;

  const summary = getMockSummary(attemptId);
  if (!summary || summary.attempt.userId !== userId) redirect("/dashboard/ielts/mock-test");
  if (summary.attempt.currentSection !== "DONE") redirect(`/dashboard/ielts/mock-test/attempt/${attemptId}`);

  const { listening, reading, writing, speaking, overall } = summary;
  const needsMarking = overall === null;
  const waitingOn = [writing.band === null && "Writing", speaking.band === null && "Speaking"].filter(Boolean).join(" and ");

  const sections = [
    {
      key: "Listening",
      icon: Headphones,
      band: listening.band,
      how: "Calculated",
      note: listening.raw !== null ? `${listening.raw} / ${listening.total} correct` : null,
      links: listening.attemptId ? [{ href: `/dashboard/ielts/listening/result/${listening.attemptId}`, label: "Review answers and transcript" }] : [],
    },
    {
      key: "Reading",
      icon: BookOpen,
      band: reading.band,
      how: "Calculated",
      note: `${reading.raw} / ${reading.total} correct`,
      links: reading.attemptIds.map((id, i) => ({
        href: `/dashboard/ielts/reading/result/${id}`,
        label: reading.attemptIds.length > 1 ? `Review passage ${i + 1}` : "Review answers",
      })),
    },
    {
      key: "Writing",
      icon: PenLine,
      band: writing.band,
      how: "AI estimated",
      note:
        writing.tasks.length > 0
          ? writing.tasks
              .map((t) => `${t.taskType === "TASK1" ? "Task 1" : "Task 2"}: ${t.band === null ? "pending" : t.band.toFixed(1)}${t.tooShort ? " (too short to mark)" : ""}`)
              .join(" · ") + " · Task 2 counts double"
          : null,
      links: writing.tasks.map((t) => ({
        href: `/dashboard/ielts/writing/submission/${t.submissionId}`,
        label: `${t.taskType === "TASK1" ? "Task 1" : "Task 2"} feedback`,
      })),
    },
    {
      key: "Speaking",
      icon: Mic,
      band: speaking.band,
      how: "AI estimated",
      note: "Based on your transcript and timing, not your audio",
      links: speaking.sessionId ? [{ href: `/dashboard/ielts/speaking/session/${speaking.sessionId}`, label: "Speaking feedback" }] : [],
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{summary.mock?.title ?? "Mock test"} — Results</h1>
        <p className="mt-1 text-sm text-ink-soft">Full IELTS mock test</p>
      </div>

      <Card className="flex flex-col items-center gap-2 p-6 text-center" data-testid="overall-card">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Estimated overall band</p>
        {overall !== null ? <p className="font-display text-5xl text-primary">{overall.toFixed(1)}</p> : <p className="font-display text-3xl text-ink-soft">Pending</p>}
        <Badge tone="neutral">AI estimate, not an official IELTS score</Badge>
        <p className="mt-1 max-w-md text-xs text-ink-soft">
          The average of your four section bands, rounded to the nearest half band. Only an official IELTS test can give you a real score.
        </p>
      </Card>

      {needsMarking && <FinalizeMock attemptId={attemptId} pendingLabel={waitingOn || "test"} />}

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ key, icon: Icon, band, how, note, links }) => (
          <Card key={key} className="flex flex-col gap-3 p-5" data-testid={`section-${key.toLowerCase()}`}>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium text-ink">
                <Icon className="h-4 w-4 text-primary" /> {key}
              </span>
              <Badge tone={how === "Calculated" ? "success" : "accent"}>{how === "Calculated" ? "Scored from answers" : "AI estimated band"}</Badge>
            </div>
            <BandValue band={band} />
            <ProgressBar value={((band ?? 0) / 9) * 100} />
            {note && <p className="text-xs text-ink-soft">{note}</p>}
            {links.length > 0 && (
              <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-1">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      {l.label} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <LinkButton href="/dashboard/ielts/mock-test">Back to mock tests</LinkButton>
        <LinkButton href="/dashboard/ielts" variant="outline">
          IELTS dashboard
        </LinkButton>
      </div>
    </div>
  );
}

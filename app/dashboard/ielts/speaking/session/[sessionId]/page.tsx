import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSession, getTurns, getEvaluation } from "@/lib/services/speaking";
import { getProfile } from "@/lib/services/users";
import { summariseSession } from "@/lib/ielts/speaking-metrics";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { RetryFeedback } from "@/components/ielts/retry-feedback";
import { BandSummaryCard, CriteriaGrid } from "@/components/ielts/feedback-cards";
import { CheckCircle2, AlertCircle, ArrowRight, Info, Link2, Mic, Gauge, MessageSquareWarning, Repeat2, Timer, Keyboard } from "lucide-react";

const MODE_LABELS: Record<string, string> = {
  FULL_TEST: "Full speaking test",
  PART1_PRACTICE: "Part 1 practice",
  PART2_PRACTICE: "Part 2 practice",
  PART3_PRACTICE: "Part 3 practice",
};
const PART_LABELS = { PART1: "Part 1", PART2: "Part 2", PART3: "Part 3" } as const;

function Stat({ icon: Icon, label, value, sub, children }: { icon: any; label: string; value: string; sub?: string; children?: React.ReactNode }) {
  return (
    <Card className="p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-0.5 font-display text-2xl text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
      {children}
    </Card>
  );
}

export default async function SpeakingResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const authSession = await auth();
  const userId = (authSession!.user as any).id;

  const session = getSession(sessionId);
  if (!session || session.userId !== userId) redirect("/dashboard/ielts/speaking");
  if (session.status !== "COMPLETED") redirect(`/dashboard/ielts/speaking/${session.mode === "FULL_TEST" ? "full" : session.mode.split("_")[0].toLowerCase()}`);

  const turns = getTurns(sessionId);
  const evaluation = getEvaluation(sessionId);
  const summary = summariseSession(turns.map((t) => ({ transcript: t.transcript, audioMetrics: t.audioMetrics ?? null })));
  const target = getProfile(userId)?.ieltsTarget ?? null;
  const minutes = Math.max(1, Math.round(session.totalDurationSeconds / 60));

  const transcript = (
    <details className="rounded-xl border border-border bg-surface p-5">
      <summary className="cursor-pointer text-sm font-medium text-ink">Your answers and transcript ({turns.length})</summary>
      <div className="mt-4 flex flex-col gap-4">
        {turns.map((t, i) => (
          <div key={t.id} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{PART_LABELS[t.part]}</Badge>
              {t.audioMetrics && t.audioMetrics.durationSeconds > 0 && (
                <span className="text-xs text-ink-soft">
                  {t.audioMetrics.durationSeconds}s · {t.audioMetrics.wpm} wpm · {t.audioMetrics.fillerWordCount} fillers
                  {t.audioMetrics.typed ? " · typed" : ""}
                </span>
              )}
            </div>
            <p className="mt-2 whitespace-pre-line text-sm font-medium text-ink">
              {i + 1}. {t.questionText}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{t.transcript || "(no answer recorded)"}</p>
          </div>
        ))}
      </div>
    </details>
  );

  const actions = (
    <div className="flex flex-wrap gap-3">
      <LinkButton href="/dashboard/ielts/speaking" variant="outline">
        <Mic className="h-4 w-4" /> Practise again
      </LinkButton>
      <LinkButton href="/dashboard/ielts">
        IELTS dashboard <ArrowRight className="h-4 w-4" />
      </LinkButton>
    </div>
  );

  const header = (
    <div>
      <h1 className="font-display text-2xl text-ink">{MODE_LABELS[session.mode] ?? "Speaking"} — {evaluation ? "AI feedback" : "Finished"}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {turns.length} answers · about {minutes} min{session.topic ? ` · ${session.topic}` : ""}
      </p>
    </div>
  );

  if (!evaluation) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-dark">
              <Info className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 className="font-display text-lg text-ink">AI feedback isn't available right now</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Your answers are saved. We couldn't generate feedback yet — you can try again in a moment.
              </p>
              <RetryFeedback endpoint={`/api/ielts/speaking/${sessionId}/evaluate`} />
            </div>
          </div>
        </Card>
        {transcript}
        {actions}
      </div>
    );
  }

  const low = evaluation.bandRangeLow ?? evaluation.estimatedBand;
  const high = evaluation.bandRangeHigh ?? evaluation.estimatedBand;
  const strengths = evaluation.strengths ?? [];
  const weaknesses = evaluation.weaknesses ?? [];
  const suggestions = evaluation.suggestions ?? [];

  return (
    <div className="flex flex-col gap-6">
      {header}

      <BandSummaryCard band={evaluation.estimatedBand} low={low} high={high} target={target} />

      <CriteriaGrid
        criteria={[
          { label: "Fluency & Coherence", score: evaluation.fluencyCoherence },
          { label: "Lexical Resource", score: evaluation.lexicalResource },
          { label: "Grammatical Range & Accuracy", score: evaluation.grammarAccuracy },
          { label: "Pronunciation", score: evaluation.pronunciationEstimate, tag: "Estimate" },
        ]}
      />

      {summary.anyTyped && (
        <p className="flex items-start gap-2 rounded-lg bg-accent-soft px-4 py-3 text-sm text-ink-soft">
          <Keyboard className="mt-0.5 h-4 w-4 shrink-0" />
          Some answers were typed, so fluency and pronunciation can't be judged reliably for this session.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink">Delivery</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={Gauge}
            label="Speaking pace"
            value={summary.avgWpm > 0 ? `${summary.avgWpm} wpm` : "—"}
            sub="Natural conversation is roughly 120–160 words per minute"
          />
          <Stat icon={MessageSquareWarning} label="Filler words" value={String(summary.fillerCount)} sub={summary.fillerCount === 0 ? "None detected" : undefined}>
            {summary.fillers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {summary.fillers.map((f) => (
                  <Badge key={f.word} tone="neutral">
                    “{f.word}” ×{f.count}
                  </Badge>
                ))}
              </div>
            )}
          </Stat>
          <Stat
            icon={Repeat2}
            label="Repeated words"
            value={String(summary.immediateRepeats)}
            sub={summary.immediateRepeats === 1 ? "immediate repeat" : "immediate repeats (e.g. “the the”)"}
          >
            {summary.overused.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {summary.overused.map((w) => (
                  <Badge key={w.word} tone="accent">
                    {w.word} ×{w.count}
                  </Badge>
                ))}
              </div>
            )}
          </Stat>
          <Stat icon={Timer} label="Long pauses" value={String(summary.pauseCount)} sub="Gaps over ~2 seconds (approximate)" />
        </div>
        <p className="text-xs text-ink-soft">
          These counts come from your browser's transcript. Speech recognition often leaves out fillers and tidies up repetitions, so treat them as minimums.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">What worked well</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {s}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">What to improve</h2>
          <ul className="mt-3 flex flex-col gap-2.5">
            {weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> {w}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {evaluation.coherenceFeedback && (
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-lg text-ink">
              <Link2 className="h-4.5 w-4.5 text-primary" /> Coherence feedback
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{evaluation.coherenceFeedback}</p>
          </Card>
        )}
        {evaluation.pronunciationNotes && (
          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-display text-lg text-ink">
              <Mic className="h-4.5 w-4.5 text-primary" /> About the pronunciation estimate
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{evaluation.pronunciationNotes}</p>
          </Card>
        )}
      </div>

      {suggestions.length > 0 && (
        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">Suggested improvements</h2>
          <ol className="mt-4 flex flex-col gap-3">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {transcript}

      <p className="text-xs text-ink-soft">
        Generated by AI{evaluation.modelUsed ? ` (${evaluation.modelUsed})` : ""} from a browser-generated transcript and timing data. This is an unofficial practice estimate.
      </p>

      {actions}
    </div>
  );
}

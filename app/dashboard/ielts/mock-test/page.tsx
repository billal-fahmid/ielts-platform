import { hasFeature, requiredPlanFor } from "@/lib/services/plans";
import { checkFeature } from "@/lib/plans/gate";
import { UpgradeWall } from "@/components/plans/upgrade-wall";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMockTest, listPublishedMockTests, listUserMockAttempts } from "@/lib/services/mock-test";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StartMockButton } from "@/components/ielts/start-mock-button";
import { ClipboardCheck, Headphones, BookOpen, PenLine, Mic, ArrowRight } from "lucide-react";

const SECTIONS = [
  { label: "Listening", detail: "30 min", icon: Headphones },
  { label: "Reading", detail: "passages", icon: BookOpen },
  { label: "Writing", detail: "60 min", icon: PenLine },
  { label: "Speaking", detail: "~14 min", icon: Mic },
];

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z")).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default async function MockTestListPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const gate = checkFeature(userId, "MOCK_TESTS");
  if (!gate.allowed) return <UpgradeWall title="Full mock tests" description="Sit all four IELTS sections in one timed, full-screen test." requiredPlanName={gate.requiredPlanName} currentPlanName={gate.ent.plan.name} />;

  const mocks = listPublishedMockTests();
  const attempts = listUserMockAttempts(userId);
  const inProgress = new Map(attempts.filter((a) => a.status === "IN_PROGRESS").map((a) => [a.mockTestId, a]));
  const past = attempts.filter((a) => a.status !== "IN_PROGRESS");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Full mock tests</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Sit all four sections in order, on the clock, in full-screen mode — just like test day. Listening and Reading are scored from your answers; Writing and
          Speaking are marked by AI. Every band you see is an estimate, not an official IELTS score.
        </p>
      </div>

      {!hasFeature(gate.ent, "ADVANCED_MOCK") && (
        <Card className="p-4 text-sm text-ink" data-testid="mock-plan-note">
          On the {gate.ent.plan.name} plan your Listening and Reading are scored automatically. AI marking of Writing and Speaking (and your overall band) is included from{" "}
          {requiredPlanFor("ADVANCED_MOCK")?.name ?? "Premium"}.
        </Card>
      )}

      {mocks.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No mock tests available yet" description="Check back soon — full tests appear here once they're published." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {mocks.map((m) => {
            const current = inProgress.get(m.id);
            return (
              <Card key={m.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="neutral">{m.testType === "GENERAL_TRAINING" ? "General Training" : "Academic"}</Badge>
                  {current && <Badge tone="accent">In progress</Badge>}
                </div>
                <h2 className="font-display text-lg text-ink">{m.title}</h2>
                <ul className="grid grid-cols-2 gap-2 text-xs text-ink-soft sm:grid-cols-4">
                  {SECTIONS.map(({ label, detail, icon: Icon }) => (
                    <li key={label} className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      <span>
                        {label} <span className="text-ink-soft/70">· {detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-ink-soft">
                  Needs about 2 hours, a quiet room, a microphone, and a stable connection. Once a section starts, its clock can&apos;t be paused.
                </p>
                <StartMockButton mockTestId={m.id} resume={!!current} />
              </Card>
            );
          })}
        </div>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Your past mock tests</h2>
          <div className="flex flex-col gap-2">
            {past.map((a) => (
              <Link key={a.id} href={`/dashboard/ielts/mock-test/result/${a.id}`}>
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-primary">
                  <div>
                    <p className="text-sm font-medium text-ink">{getMockTest(a.mockTestId)?.title ?? "Mock test"}</p>
                    <p className="text-xs text-ink-soft">{formatDate(a.completedAt ?? a.startedAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.overallBand !== null ? (
                      <Badge tone="primary">Estimated band {a.overallBand.toFixed(1)}</Badge>
                    ) : (
                      <Badge tone="neutral">Marking pending</Badge>
                    )}
                    <ArrowRight className="h-4 w-4 text-ink-soft" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

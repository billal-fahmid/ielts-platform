import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/gate";
import { classForStudent } from "@/lib/services/live-classes";
import { CLASS_STATE_LABELS } from "@/lib/classes/rules";
import { formatSlotTime } from "@/lib/reviews/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { JoinClassButton } from "@/components/reviews/join-class-button";

export const metadata = { title: "Live class — BanglaEnglish" };

const TONE = { UPCOMING: "primary", LIVE: "success", FINISHED: "neutral", CANCELLED: "danger" } as const;

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;
  // Only classes that are for this student; anything else looks like a missing page.
  const found = classForStudent(userId, id);
  if (!found) notFound();
  const gate = checkFeature(userId, "LIVE_CLASSES");
  const { class: c, state, teacherName, attendance, materials, joinable } = found;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/dashboard/classes" className="text-sm text-ink-soft hover:text-ink">
        ← Live classes
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">{c.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {formatSlotTime(c.startsAt)} (Bangladesh time) · {c.durationMinutes} minutes · with {teacherName}
          </p>
        </div>
        <Badge tone={TONE[state]}>{CLASS_STATE_LABELS[state]}</Badge>
      </div>

      {c.description && <Card className="p-5 text-sm text-ink">{c.description}</Card>}
      {state === "CANCELLED" && <Card className="p-4 text-sm text-ink-soft">This class was cancelled{c.cancelReason ? `: ${c.cancelReason}` : "."}</Card>}

      {state !== "CANCELLED" && state !== "FINISHED" && (
        <Card className="p-5">
          {!gate.allowed ? (
            <div className="flex flex-wrap items-center justify-between gap-3" data-testid="class-locked">
              <p className="text-sm text-ink-soft">
                Joining live classes is included from the <strong className="text-ink">{gate.requiredPlanName}</strong> plan. You&apos;re on <strong className="text-ink">{gate.ent.plan.name}</strong>.
              </p>
              <LinkButton href="/dashboard/billing" size="sm">
                See my plan
              </LinkButton>
            </div>
          ) : joinable ? (
            <JoinClassButton classId={c.id} />
          ) : (
            <p className="text-sm text-ink-soft">The join button appears 10 minutes before the class starts.</p>
          )}
          {attendance && <p className="mt-3 text-xs text-ink-soft">You joined this class.</p>}
        </Card>
      )}

      {gate.allowed && c.recordingUrl && (
        <Card className="p-5" data-testid="recording">
          <h2 className="font-display text-lg text-ink">Recording</h2>
          <a href={c.recordingUrl} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex items-center gap-2 text-primary underline">
            <PlayCircle className="h-5 w-5" /> Watch the class recording
          </a>
        </Card>
      )}

      {gate.allowed && materials.length > 0 && (
        <Card className="p-5" data-testid="class-materials">
          <h2 className="font-display text-lg text-ink">Materials</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {materials.map((m) => (
              <li key={m.id}>
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                  {m.title}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {state === "FINISHED" && attendance && <p className="text-sm text-ink-soft">You were marked {attendance.status.toLowerCase()}.</p>}
    </div>
  );
}

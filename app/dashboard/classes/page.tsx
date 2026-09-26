import Link from "next/link";
import { Video } from "lucide-react";
import { auth } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/gate";
import { classesForStudent, sendDueReminders } from "@/lib/services/live-classes";
import { CLASS_STATE_LABELS } from "@/lib/classes/rules";
import { formatSlotTime } from "@/lib/reviews/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { JoinClassButton } from "@/components/reviews/join-class-button";

export const metadata = { title: "Live classes — BanglaEnglish" };

const TONE = { UPCOMING: "primary", LIVE: "success", FINISHED: "neutral", CANCELLED: "danger" } as const;

export default async function ClassesPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  sendDueReminders();
  const gate = checkFeature(userId, "LIVE_CLASSES");
  const all = classesForStudent(userId);
  const upcoming = all.filter((r) => r.state === "UPCOMING" || r.state === "LIVE");
  const past = all.filter((r) => !upcoming.includes(r)).reverse();

  const card = (r: (typeof all)[number]) => (
    <Card key={r.class.id} className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/dashboard/classes/${r.class.id}`} className="font-medium text-ink hover:text-primary">
            {r.class.title}
          </Link>
          <p className="mt-0.5 text-xs text-ink-soft">
            {formatSlotTime(r.class.startsAt)} · {r.class.durationMinutes} min · with {r.teacherName}
          </p>
        </div>
        <Badge tone={TONE[r.state]}>{CLASS_STATE_LABELS[r.state]}</Badge>
      </div>
      {r.state !== "CANCELLED" && r.state !== "FINISHED" && (gate.allowed ? r.joinable ? <JoinClassButton classId={r.class.id} /> : <p className="text-xs text-ink-soft">You can join 10 minutes before it starts.</p> : null)}
      {r.state === "FINISHED" && r.attendance && <p className="text-xs text-ink-soft">You were marked {r.attendance.status.toLowerCase()}.</p>}
      {r.state === "CANCELLED" && r.class.cancelReason && <p className="text-xs text-ink-soft">Cancelled: {r.class.cancelReason}</p>}
    </Card>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Live classes</h1>
        <p className="mt-1 text-sm text-ink-soft">Classes your teachers have scheduled for your batches and courses. Times are Bangladesh time.</p>
      </div>

      {!gate.allowed && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5" data-testid="classes-locked">
          <p className="text-sm text-ink-soft">
            Joining live classes is included from the <strong className="text-ink">{gate.requiredPlanName}</strong> plan. You&apos;re on <strong className="text-ink">{gate.ent.plan.name}</strong>. You can still see the schedule.
          </p>
          <LinkButton href="/dashboard/billing" size="sm">
            See my plan
          </LinkButton>
        </Card>
      )}

      {all.length === 0 ? (
        <EmptyState icon={Video} title="No classes yet" description="When a teacher adds you to a batch or you join one of their courses, their live classes will show up here." />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg text-ink">Upcoming</h2>
              <div className="flex flex-col gap-3" data-testid="upcoming-classes">
                {upcoming.map(card)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg text-ink">Past</h2>
              <div className="flex flex-col gap-3" data-testid="past-classes">
                {past.map(card)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

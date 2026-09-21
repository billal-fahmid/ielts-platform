import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { requirePageRole } from "@/lib/security/guards";
import { listTeacherSlots } from "@/lib/services/speaking-sessions";
import { formatSlotTime, slotEnd, SLOT_STATUS_LABELS } from "@/lib/reviews/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CancelSlotButton, NewSlotForm } from "@/components/teacher/session-controls";

export const metadata = { title: "Speaking sessions — Teaching" };

const TONE = { OPEN: "neutral", BOOKED: "primary", IN_PROGRESS: "accent", COMPLETED: "success", CANCELLED: "neutral", NO_SHOW: "danger" } as const;

export default async function TeacherSessionsPage() {
  const user = await requirePageRole(["TEACHER"]);
  const all = listTeacherSlots(user.id);
  const now = Date.now();
  const upcoming = all.filter((s) => slotEnd(s) > now || s.status === "IN_PROGRESS");
  const past = all.filter((s) => !upcoming.includes(s)).reverse();

  const row = (s: (typeof all)[number], actions: boolean) => (
    <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">
          {formatSlotTime(s.startsAt)} <span className="font-normal text-ink-soft">· {s.durationMinutes} min</span>
        </p>
        <p className="text-xs text-ink-soft">{s.studentName ? `With ${s.studentName}` : s.status === "OPEN" ? "Waiting for a student to book" : "—"}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={TONE[s.status]}>{SLOT_STATUS_LABELS[s.status]}</Badge>
        {s.status !== "OPEN" && (
          <Link href={`/teacher/sessions/${s.id}`} className="text-sm font-medium text-primary hover:underline">
            Open
          </Link>
        )}
        {actions && (s.status === "OPEN" || s.status === "BOOKED") && <CancelSlotButton slotId={s.id} booked={s.status === "BOOKED"} studentName={s.studentName} />}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Speaking sessions</h1>
        <p className="mt-1 text-sm text-ink-soft">Publish times when you can run a one-to-one IELTS speaking session. Pro students book them; you run the session, score it and send feedback. All times are Bangladesh time.</p>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Add a time slot</h2>
        <div className="mt-4">
          <NewSlotForm defaultMeetingUrl="" />
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No upcoming slots" description="Add a time above so students can book a session with you." />
        ) : (
          <Card className="divide-y divide-border p-0" data-testid="upcoming-slots">
            {upcoming.map((s) => row(s, true))}
          </Card>
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Past</h2>
          <Card className="divide-y divide-border p-0" data-testid="past-slots">
            {past.map((s) => row(s, false))}
          </Card>
        </section>
      )}
    </div>
  );
}

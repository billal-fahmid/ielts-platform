import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/security/guards";
import { slotForTeacher } from "@/lib/services/speaking-sessions";
import { canMarkNoShow, canStart, formatSlotTime, SLOT_STATUS_LABELS, slotStart, START_EARLY_MINUTES } from "@/lib/reviews/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CancelSlotButton, NoShowButton, SessionForm, StartSessionButton } from "@/components/teacher/session-controls";

export const metadata = { title: "Speaking session — Teaching" };

const TONE = { OPEN: "neutral", BOOKED: "primary", IN_PROGRESS: "accent", COMPLETED: "success", CANCELLED: "neutral", NO_SHOW: "danger" } as const;

export default async function TeacherSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageRole(["TEACHER"]);
  // Only the teacher who owns the slot; anyone else looks like a missing page.
  const s = slotForTeacher(user.id, id);
  if (!s) notFound();
  const now = new Date();
  const startable = canStart(s, now);
  const opensAt = new Date(slotStart(s) - START_EARLY_MINUTES * 60_000);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/teacher/sessions" className="text-sm text-ink-soft hover:text-ink">
        ← Speaking sessions
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">{s.studentName ? `Session with ${s.studentName}` : "Open slot"}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {formatSlotTime(s.startsAt)} (Bangladesh time) · {s.durationMinutes} minutes
            {s.targetBand != null && ` · target Band ${s.targetBand}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={TONE[s.status]}>{SLOT_STATUS_LABELS[s.status]}</Badge>
          {s.status === "BOOKED" && <CancelSlotButton slotId={s.id} booked studentName={s.studentName} redirectTo="/teacher/sessions" />}
        </div>
      </div>

      <Card className="flex flex-col gap-2 p-5 text-sm">
        <p>
          <span className="font-medium text-ink">Meeting link: </span>
          <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-primary underline">
            {s.meetingUrl}
          </a>
        </p>
        {s.studentNote && (
          <p>
            <span className="font-medium text-ink">The student wants to practise: </span>
            {s.studentNote}
          </p>
        )}
        {s.cancelReason && <p className="text-ink-soft">Cancelled: {s.cancelReason}</p>}
      </Card>

      {s.status === "BOOKED" && (
        <Card className="flex flex-wrap items-start gap-4 p-5">
          <StartSessionButton slotId={s.id} disabledReason={startable ? null : canMarkNoShow(s, now) ? "The start time has passed." : `You can start ${START_EARLY_MINUTES} minutes before it begins (${formatSlotTime(opensAt.toISOString())}).`} />
          {canMarkNoShow(s, now) && <NoShowButton slotId={s.id} />}
        </Card>
      )}

      {(s.status === "IN_PROGRESS" || s.status === "COMPLETED") && (
        <Card className="p-5">
          <h2 className="font-display text-lg text-ink">{s.status === "COMPLETED" ? "Scores and feedback" : "Run the session"}</h2>
          <p className="mt-1 text-xs text-ink-soft">Score the four IELTS speaking criteria after the session. These are your estimates and are labelled that way for the student.</p>
          <div className="mt-4">
            <SessionForm
              slotId={s.id}
              completed={s.status === "COMPLETED"}
              initial={{ teacherNotes: s.teacherNotes, fluencyBand: s.fluencyBand, lexicalBand: s.lexicalBand, grammarBand: s.grammarBand, pronunciationBand: s.pronunciationBand, overallBand: s.overallBand, feedback: s.feedback }}
            />
          </div>
        </Card>
      )}
    </div>
  );
}

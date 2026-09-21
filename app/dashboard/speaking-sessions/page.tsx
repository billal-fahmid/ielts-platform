import { CalendarClock, Video } from "lucide-react";
import { auth } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/gate";
import { listOpenSlots, listStudentSessions } from "@/lib/services/speaking-sessions";
import { canStudentCancel, formatSlotTime, SLOT_STATUS_LABELS, slotEnd } from "@/lib/reviews/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { BookSlotButton, CancelBookingButton } from "@/components/reviews/student-controls";

export const metadata = { title: "1-on-1 speaking — BanglaEnglish" };

const TONE = { OPEN: "neutral", BOOKED: "primary", IN_PROGRESS: "accent", COMPLETED: "success", CANCELLED: "neutral", NO_SHOW: "danger" } as const;
const STUDENT_LABELS: Record<string, string> = { ...SLOT_STATUS_LABELS, NO_SHOW: "Missed" };

export default async function SpeakingSessionsPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const gate = checkFeature(userId, "ONE_ON_ONE");
  const mine = listStudentSessions(userId);
  const now = new Date();
  const upcoming = mine.filter((s) => (s.status === "BOOKED" || s.status === "IN_PROGRESS") && slotEnd(s) > now.getTime()).reverse();
  const past = mine.filter((s) => !upcoming.includes(s));
  const open = gate.allowed ? listOpenSlots(now) : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">1-on-1 speaking</h1>
        <p className="mt-1 text-sm text-ink-soft">Practise with a real teacher on a video call. They score you on the four IELTS speaking criteria and send written feedback. Times are Bangladesh time. Scores are your teacher&apos;s estimates, not official IELTS results.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink">My sessions</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink-soft">No upcoming sessions.</p>
        ) : (
          <div className="flex flex-col gap-3" data-testid="upcoming-sessions">
            {upcoming.map((s) => (
              <Card key={s.id} className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">
                      {formatSlotTime(s.startsAt)} <span className="font-normal text-ink-soft">· {s.durationMinutes} min with {s.teacherName}</span>
                    </p>
                    {s.studentNote && <p className="mt-0.5 text-xs text-ink-soft">You&apos;ll practise: {s.studentNote}</p>}
                  </div>
                  <Badge tone={TONE[s.status]}>{s.status === "IN_PROGRESS" ? "Started: join now" : STUDENT_LABELS[s.status]}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {s.meetingUrl && (
                    <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
                      <Video className="h-4 w-4" /> Open meeting link
                    </a>
                  )}
                  {canStudentCancel(s, now) ? <CancelBookingButton slotId={s.id} /> : s.status === "BOOKED" && <span className="text-xs text-ink-soft">Too close to the start to cancel here. Please message your teacher.</span>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink">Book a session</h2>
        {!gate.allowed ? (
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5" data-testid="sessions-locked">
            <p className="text-sm text-ink-soft">
              1-on-1 speaking sessions are included from the <strong className="text-ink">{gate.requiredPlanName}</strong> plan. You&apos;re on <strong className="text-ink">{gate.ent.plan.name}</strong>.
            </p>
            <LinkButton href="/dashboard/billing" size="sm">
              See my plan
            </LinkButton>
          </Card>
        ) : open.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No open times right now" description="Teachers add new times regularly. Check back soon; you'll get a notification when you book one." />
        ) : (
          <Card className="divide-y divide-border p-0" data-testid="open-slots">
            {open.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{formatSlotTime(s.startsAt)}</p>
                  <p className="text-xs text-ink-soft">
                    {s.durationMinutes} minutes with {s.teacherName}
                  </p>
                </div>
                <BookSlotButton slotId={s.id} when={formatSlotTime(s.startsAt)} />
              </div>
            ))}
          </Card>
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Past sessions</h2>
          <div className="flex flex-col gap-3" data-testid="past-sessions">
            {past.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">
                    {formatSlotTime(s.startsAt)} <span className="font-normal text-ink-soft">· with {s.teacherName}</span>
                  </p>
                  <Badge tone={TONE[s.status]}>{STUDENT_LABELS[s.status]}</Badge>
                </div>
                {s.status === "COMPLETED" && (
                  <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-xs text-ink-soft">Teacher&apos;s estimate</span>
                      <span className="font-display text-2xl text-ink">Band {s.overallBand?.toFixed(1)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      {[
                        ["Fluency and coherence", s.fluencyBand],
                        ["Lexical resource", s.lexicalBand],
                        ["Grammar", s.grammarBand],
                        ["Pronunciation", s.pronunciationBand],
                      ].map(([label, band]) => (
                        <div key={label as string} className="rounded-lg bg-primary-soft/40 p-3">
                          <p className="text-xs text-ink-soft">{label}</p>
                          <p className="font-medium text-ink">{(band as number | null)?.toFixed(1) ?? "—"}</p>
                        </div>
                      ))}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-ink">{s.feedback}</p>
                  </div>
                )}
                {s.status === "CANCELLED" && s.cancelReason && <p className="mt-2 text-xs text-ink-soft">Your teacher cancelled: {s.cancelReason}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

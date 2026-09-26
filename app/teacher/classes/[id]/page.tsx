import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requirePageRole } from "@/lib/security/guards";
import { classForTeacher } from "@/lib/services/live-classes";
import { listBatches } from "@/lib/services/teaching";
import { listForTeacher } from "@/lib/services/teacher-content";
import { CLASS_STATE_LABELS, classState } from "@/lib/classes/rules";
import { formatSlotTime, utcIsoToDhakaLocal } from "@/lib/reviews/rules";
import { formatWhen } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttendanceSelect, CancelClassButton, ClassForm, MaterialForm, RecordingForm, RemoveMaterialButton } from "@/components/teacher/class-controls";

export const metadata = { title: "Live class — Teaching" };

const TONE = { UPCOMING: "primary", LIVE: "success", FINISHED: "neutral", CANCELLED: "danger" } as const;

export default async function TeacherClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageRole(["TEACHER"]);
  // Only the teacher who owns the class; anyone else looks like a missing page.
  const view = classForTeacher(user.id, id);
  if (!view) notFound();
  const { class: c, roster, materials } = view;
  const state = classState(c);
  const readOnly = state === "FINISHED" || state === "CANCELLED";
  const attended = roster.filter((r) => r.attendance && r.attendance.status !== "ABSENT").length;

  const batches = listBatches(user.id).filter((b) => b.status === "ACTIVE" || b.id === c.batchId).map((b) => ({ id: b.id, label: b.name }));
  const courses = (listForTeacher(user.id, "courses") as { id: string; title: string }[]).map((x) => ({ id: x.id, label: x.title }));
  const anyAttendance = roster.some((r) => r.attendance);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link href="/teacher/classes" className="text-sm text-ink-soft hover:text-ink">
        ← Live classes
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">{c.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {formatSlotTime(c.startsAt)} (Bangladesh time) · {c.durationMinutes} minutes · {roster.length} student{roster.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={TONE[state]}>{CLASS_STATE_LABELS[state]}</Badge>
          {(state === "UPCOMING" || state === "LIVE") && <CancelClassButton classId={c.id} />}
        </div>
      </div>

      {c.status === "CANCELLED" && <Card className="p-4 text-sm text-ink-soft">This class was cancelled{c.cancelReason ? `: ${c.cancelReason}` : "."}</Card>}

      {c.status === "SCHEDULED" && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="min-w-0 text-sm">
            <p className="font-medium text-ink">Your meeting link</p>
            <p className="mt-0.5 break-all text-ink-soft">{c.meetingUrl}</p>
          </div>
          <a href={c.meetingUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
            <ExternalLink className="h-4 w-4" /> Open meeting
          </a>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Attendance</h2>
        <p className="mt-1 text-xs text-ink-soft">
          Students who press Join are recorded automatically (late after the first 10 minutes). You can change anyone. {state !== "UPCOMING" && `${attended} of ${roster.length} attended.`}
        </p>
        {roster.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Nobody is in this class yet. Add students to the batch, or wait for students to enrol in the course.</p>
        ) : (
          <div className="mt-3 divide-y divide-border" data-testid="roster">
            {roster.map(({ student, attendance }) => (
              <div key={student.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <Link href={`/teacher/students/${student.id}`} className="text-sm font-medium text-ink hover:text-primary">
                    {student.name}
                  </Link>
                  <p className="text-xs text-ink-soft">{attendance?.joinedAt ? `Joined ${formatWhen(attendance.joinedAt)}` : attendance ? "Set by you" : "Not joined"}</p>
                </div>
                <AttendanceSelect classId={c.id} studentId={student.id} value={attendance?.status ?? null} name={student.name} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Materials</h2>
        {materials.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Nothing shared yet. Slides, worksheets and audio you add are visible to the students in this class.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border" data-testid="materials">
            {materials.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-primary underline">
                  {m.title}
                </a>
                <RemoveMaterialButton classId={c.id} materialId={m.id} title={m.title} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 border-t border-border pt-4">
          <MaterialForm classId={c.id} />
        </div>
      </Card>

      {c.status === "SCHEDULED" && state !== "UPCOMING" && (
        <Card className="p-5">
          <h2 className="font-display text-lg text-ink">Recording</h2>
          <div className="mt-3">
            <RecordingForm classId={c.id} current={c.recordingUrl} />
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Class details</h2>
        {readOnly && <p className="mt-1 text-xs text-ink-soft">{state === "FINISHED" ? "This class is over, so its details can no longer be changed." : "Cancelled classes can't be edited."}</p>}
        <div className="mt-4">
          <ClassForm
            cls={{ id: c.id, title: c.title, description: c.description, batchId: c.batchId, courseId: c.courseId, startsAtLocal: utcIsoToDhakaLocal(c.startsAt), durationMinutes: c.durationMinutes, provider: c.provider, meetingUrl: c.meetingUrl }}
            batches={batches}
            courses={courses}
            locked={anyAttendance}
            disabled={readOnly}
          />
        </div>
      </Card>
    </div>
  );
}

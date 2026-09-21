import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAssignmentForStudent } from "@/lib/services/assignments";
import { formatDay, formatWhen, isPastDue, scorePercent, STATUS_LABELS } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitAssignmentForm } from "@/components/teacher/submit-assignment-form";

export const metadata = { title: "Assignment — BanglaEnglish" };

const TONE = { TODO: "accent", SUBMITTED: "primary", GRADED: "success", OVERDUE: "danger" } as const;

export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;
  // Only assignments that are for this student; anything else looks like a missing page.
  const found = getAssignmentForStudent(userId, id);
  if (!found) notFound();
  const { assignment: a, submission: s, status, teacherName } = found;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/dashboard/assignments" className="text-sm text-ink-soft hover:text-ink">
        ← Assignments
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">{a.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            From {teacherName} · {a.dueAt ? `Due ${formatDay(a.dueAt)}` : "No due date"} · out of {a.maxScore}
          </p>
        </div>
        <Badge tone={TONE[status]} className="text-sm">
          {STATUS_LABELS[status]}
        </Badge>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Instructions</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{a.instructions}</p>
        {a.attachmentUrl && (
          <p className="mt-3 text-sm">
            <a href={a.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Open the attached file
            </a>
          </p>
        )}
      </Card>

      {s?.status === "GRADED" && (
        <Card className="border-success/40 bg-success-soft/40 p-5" data-testid="grade-card">
          <h2 className="font-display text-lg text-ink">Your teacher&apos;s grade</h2>
          <p className="mt-2 font-display text-3xl text-ink">
            {s.score}
            <span className="text-lg text-ink-soft"> / {a.maxScore}</span> <span className="text-base text-ink-soft">({scorePercent(s.score ?? 0, a.maxScore)}%)</span>
          </p>
          {s.feedback && <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{s.feedback}</p>}
          <p className="mt-3 text-xs text-ink-soft">Graded {formatWhen(s.gradedAt)} by {teacherName}.</p>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Your answer</h2>
        {s?.status === "GRADED" ? (
          <>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{s.answerText || <span className="text-ink-soft">(no written answer)</span>}</p>
            {s.linkUrl && (
              <p className="mt-2 text-sm">
                Link:{" "}
                <a href={s.linkUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-primary underline">
                  {s.linkUrl}
                </a>
              </p>
            )}
          </>
        ) : (
          <>
            {status === "OVERDUE" && <p className="mt-2 text-sm text-danger">The due date has passed. You can still hand it in, and your teacher will see when.</p>}
            {s && <p className="mt-2 text-xs text-ink-soft">Handed in {formatWhen(s.submittedAt)}. You can change it until your teacher grades it.</p>}
            <SubmitAssignmentForm assignmentId={a.id} initialText={s?.answerText ?? ""} initialLink={s?.linkUrl ?? ""} resubmitting={!!s} pastDue={isPastDue(a.dueAt)} />
          </>
        )}
      </Card>
    </div>
  );
}

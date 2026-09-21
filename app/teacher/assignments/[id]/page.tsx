import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/security/guards";
import { submissionsForTeacher } from "@/lib/services/assignments";
import { listBatches } from "@/lib/services/teaching";
import { listForTeacher } from "@/lib/services/teacher-content";
import { formatDay, formatWhen, isPastDue } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssignmentForm, DeleteAssignmentButton, GradeForm } from "@/components/teacher/assignment-controls";

export const metadata = { title: "Assignment — Teaching" };

export default async function TeacherAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageRole(["TEACHER"]);
  const view = submissionsForTeacher(user.id, id);
  if (!view) notFound();
  const { assignment: a, rows } = view;

  const batches = listBatches(user.id).filter((b) => b.status === "ACTIVE" || b.id === a.batchId).map((b) => ({ id: b.id, label: b.name }));
  const courses = (listForTeacher(user.id, "courses") as { id: string; title: string }[]).map((c) => ({ id: c.id, label: c.title }));
  const submitted = rows.filter((r) => r.submission).length;
  const toGrade = rows.filter((r) => r.submission?.status === "SUBMITTED").length;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/teacher/assignments" className="text-sm text-ink-soft hover:text-ink">
        ← Assignments
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">{a.title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {a.published ? "Live" : "Draft"} · Due {formatDay(a.dueAt)} · out of {a.maxScore} · {submitted}/{rows.length} submitted
            {toGrade > 0 && ` · ${toGrade} to grade`}
          </p>
        </div>
        <DeleteAssignmentButton assignmentId={a.id} />
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Submissions</h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No students are assigned yet. Add students to the batch, or wait for students to enrol in the course.</p>
        ) : (
          <div className="mt-3 flex flex-col divide-y divide-border" data-testid="submissions">
            {rows.map(({ student, submission: s }) => (
              <div key={student.id} id={s ? `s-${s.id}` : undefined} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/teacher/students/${student.id}`} className="text-sm font-medium text-ink hover:text-primary">
                      {student.name}
                    </Link>
                    <p className="text-xs text-ink-soft">{s ? `Submitted ${formatWhen(s.submittedAt)}` : isPastDue(a.dueAt) ? "Nothing submitted (past due)" : "Not submitted yet"}</p>
                  </div>
                  {s ? s.status === "GRADED" ? <Badge tone="success">Graded {s.score}/{a.maxScore}</Badge> : <Badge tone="accent">Needs grading</Badge> : <Badge>Waiting</Badge>}
                </div>
                {s && (
                  <>
                    <div className="mt-3 whitespace-pre-wrap rounded-lg bg-primary-soft/40 p-3 text-sm text-ink">{s.answerText || <span className="text-ink-soft">(no written answer)</span>}</div>
                    {s.linkUrl && (
                      <p className="mt-2 text-sm">
                        Link:{" "}
                        <a href={s.linkUrl} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-primary underline">
                          {s.linkUrl}
                        </a>
                      </p>
                    )}
                    <GradeForm assignmentId={a.id} submissionId={s.id} maxScore={a.maxScore} initialScore={s.score} initialFeedback={s.feedback} graded={s.status === "GRADED"} />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Edit assignment</h2>
        <div className="mt-4">
          <AssignmentForm
            assignment={{ id: a.id, title: a.title, instructions: a.instructions, batchId: a.batchId, courseId: a.courseId, attachmentUrl: a.attachmentUrl, dueAt: a.dueAt, maxScore: a.maxScore, published: a.published }}
            batches={batches}
            courses={courses}
            locked={submitted > 0}
          />
        </div>
      </Card>
    </div>
  );
}

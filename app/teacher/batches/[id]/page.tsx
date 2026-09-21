import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/security/guards";
import { batchMembersDetailed, getOwnBatch } from "@/lib/services/teaching";
import { listForTeacher } from "@/lib/services/teacher-content";
import { listTeacherAssignments } from "@/lib/services/assignments";
import { formatDay, formatWhen } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { AddMemberForm, BatchForm, DeleteBatchButton, RemoveMemberButton } from "@/components/teacher/batch-controls";

export const metadata = { title: "Batch — Teaching" };

export default async function TeacherBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageRole(["TEACHER"]);
  const batch = getOwnBatch(user.id, id);
  if (!batch) notFound();

  const members = batchMembersDetailed(id);
  const courses = (listForTeacher(user.id, "courses") as { id: string; title: string }[]).map((c) => ({ id: c.id, title: c.title }));
  const work = listTeacherAssignments(user.id).filter((a) => a.batchId === id);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/teacher/batches" className="text-sm text-ink-soft hover:text-ink">
        ← Batches
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">{batch.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {members.length} student{members.length === 1 ? "" : "s"}
            {batch.capacity ? ` of ${batch.capacity}` : ""}
            {batch.startsOn ? ` · ${formatDay(batch.startsOn)}${batch.endsOn ? ` – ${formatDay(batch.endsOn)}` : ""}` : ""}
          </p>
        </div>
        <Badge tone={batch.status === "ACTIVE" ? "success" : "neutral"}>{batch.status === "ACTIVE" ? "Active" : "Archived"}</Badge>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Students</h2>
        <div className="mt-3">
          <AddMemberForm batchId={id} disabled={batch.status === "ARCHIVED"} />
        </div>
        {members.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">No students in this batch yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border" data-testid="member-list">
            {members.map((m) => (
              <li key={m.studentId} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <Link href={`/teacher/students/${m.studentId}`} className="text-sm font-medium text-ink hover:text-primary">
                    {m.name}
                  </Link>
                  <p className="truncate text-xs text-ink-soft">
                    {m.email} · joined {formatWhen(m.joinedAt)}
                  </p>
                </div>
                <RemoveMemberButton batchId={id} studentId={m.studentId} name={m.name} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-ink">Assignments for this batch</h2>
          <LinkButton href="/teacher/assignments/new" size="sm" variant="outline">
            New assignment
          </LinkButton>
        </div>
        {work.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Nothing assigned yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {work.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <Link href={`/teacher/assignments/${a.id}`} className="font-medium text-ink hover:text-primary">
                  {a.title}
                </Link>
                <span className="text-xs text-ink-soft">
                  {a.submitted}/{a.audience} submitted {a.published ? "" : "· draft"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Batch details</h2>
        <div className="mt-4">
          <BatchForm batch={{ id: batch.id, name: batch.name, description: batch.description, courseId: batch.courseId, capacity: batch.capacity, startsOn: batch.startsOn, endsOn: batch.endsOn, status: batch.status }} courses={courses} />
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <DeleteBatchButton batchId={id} />
        </div>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requirePageRole } from "@/lib/security/guards";
import { listTeacherAssignments } from "@/lib/services/assignments";
import { formatDay, isPastDue } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Assignments — Teaching" };

export default async function TeacherAssignmentsPage() {
  const user = await requirePageRole(["TEACHER"]);
  const items = listTeacherAssignments(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Assignments</h1>
          <p className="mt-1 text-sm text-ink-soft">Set work for a batch or a course, then review and grade what students hand in.</p>
        </div>
        <LinkButton href="/teacher/assignments/new">
          <Plus className="h-4 w-4" /> New assignment
        </LinkButton>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No assignments yet" description="Create an assignment for one of your batches or courses." action={<LinkButton href="/teacher/assignments/new">Create assignment</LinkButton>} />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm" data-testid="assignment-table">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Assignment</th>
                <th className="px-4 py-3 font-medium">For</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">To grade</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-primary-soft/40">
                  <td className="px-4 py-3">
                    <Link href={`/teacher/assignments/${a.id}`} className="font-medium text-ink hover:text-primary">
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{a.target}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatDay(a.dueAt)}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {a.submitted}/{a.audience}
                  </td>
                  <td className="px-4 py-3">{a.toGrade > 0 ? <Badge tone="accent">{a.toGrade}</Badge> : <span className="text-ink-soft">0</span>}</td>
                  <td className="px-4 py-3">{!a.published ? <Badge>Draft</Badge> : isPastDue(a.dueAt) ? <Badge tone="neutral">Closed</Badge> : <Badge tone="success">Live</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

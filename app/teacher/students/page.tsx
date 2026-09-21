import Link from "next/link";
import { Users } from "lucide-react";
import { requirePageRole } from "@/lib/security/guards";
import { teacherStudents } from "@/lib/services/teacher-stats";
import { formatDay } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";

export const metadata = { title: "Students — Teaching" };

export default async function TeacherStudentsPage() {
  const user = await requirePageRole(["TEACHER"]);
  const students = teacherStudents(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Students</h1>
        <p className="mt-1 text-sm text-ink-soft">{students.length} in your batches and courses. You can see progress only for these students.</p>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students yet"
          description="Students appear here when you add them to a batch, or when they enrol in one of your published courses."
          action={<LinkButton href="/teacher/batches">Create a batch</LinkButton>}
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm" data-testid="students-table">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Batches</th>
                <th className="px-4 py-3 font-medium">Course progress</th>
                <th className="px-4 py-3 font-medium">Assignments</th>
                <th className="px-4 py-3 font-medium">Last studied</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-primary-soft/40">
                  <td className="px-4 py-3">
                    <Link href={`/teacher/students/${s.id}`} className="font-medium text-ink hover:text-primary">
                      {s.name}
                    </Link>
                    <p className="text-xs text-ink-soft">{s.email}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{s.batches.length ? s.batches.join(", ") : "—"}</td>
                  <td className="min-w-40 px-4 py-3">
                    {s.avgProgress === null ? (
                      <span className="text-ink-soft">Not enrolled</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ProgressBar value={s.avgProgress} className="w-24" />
                        <span className="text-xs text-ink-soft">{s.avgProgress}%</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{s.avgAssignmentScore === null ? "—" : `${s.avgAssignmentScore}% avg`}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatDay(s.lastStudyDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

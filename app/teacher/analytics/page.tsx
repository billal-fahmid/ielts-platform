import { requirePageRole } from "@/lib/security/guards";
import { teacherAnalytics } from "@/lib/services/teacher-stats";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { Stat } from "@/components/teacher/stat";

export const metadata = { title: "Analytics — Teaching" };

const pct = (n: number | null) => (n === null ? "—" : `${n}%`);

export default async function TeacherAnalyticsPage() {
  const user = await requirePageRole(["TEACHER"]);
  const a = teacherAnalytics(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Analytics</h1>
        <p className="mt-1 text-sm text-ink-soft">How your students are doing across your courses and assignments.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Students" value={a.totals.students} testId="an-students" />
        <Stat label="Studied this week" value={a.totals.activeThisWeek} hint="In the last 7 days" testId="an-active" />
        <Stat label="Not studied in 2 weeks" value={a.totals.inactive} hint={a.totals.inactive ? "Worth a message" : undefined} testId="an-inactive" />
      </div>

      <Card className="overflow-x-auto p-0">
        <h2 className="px-5 pt-5 font-display text-lg text-ink">Courses</h2>
        {a.courses.length === 0 ? (
          <p className="p-5 text-sm text-ink-soft">You haven&apos;t created a course yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm" data-testid="course-analytics">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3 font-medium">Course</th>
                <th className="px-4 py-3 font-medium">Enrolled</th>
                <th className="px-4 py-3 font-medium">New (30 days)</th>
                <th className="px-4 py-3 font-medium">Completion</th>
                <th className="px-4 py-3 font-medium">Quiz average</th>
              </tr>
            </thead>
            <tbody>
              {a.courses.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">
                    {c.title} {!c.published && <span className="text-xs font-normal text-ink-soft">(draft)</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{c.enrolled}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.newThisMonth}</td>
                  <td className="min-w-36 px-4 py-3">
                    {c.completionRate === null ? (
                      <span className="text-ink-soft">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ProgressBar value={c.completionRate} className="w-20" />
                        <span className="text-xs text-ink-soft">
                          {c.completionRate}% ({c.completed}/{c.enrolled})
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{c.quizAttempts ? `${pct(c.quizAverage)} (${c.quizAttempts} attempts)` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="overflow-x-auto p-0">
        <h2 className="px-5 pt-5 font-display text-lg text-ink">Assignments</h2>
        {a.assignments.length === 0 ? (
          <p className="p-5 text-sm text-ink-soft">No published assignments yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm" data-testid="assignment-analytics">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3 font-medium">Assignment</th>
                <th className="px-4 py-3 font-medium">Submission rate</th>
                <th className="px-4 py-3 font-medium">Graded</th>
                <th className="px-4 py-3 font-medium">Average score</th>
              </tr>
            </thead>
            <tbody>
              {a.assignments.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{r.title}</td>
                  <td className="min-w-36 px-4 py-3">
                    {r.submissionRate === null ? (
                      <span className="text-ink-soft">—</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <ProgressBar value={r.submissionRate} className="w-20" />
                        <span className="text-xs text-ink-soft">
                          {r.submitted}/{r.audience}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{r.graded}</td>
                  <td className="px-4 py-3 text-ink-soft">{pct(r.averageScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-xs text-ink-soft">Scores are your own grades; band scores elsewhere on the platform are estimates.</p>
    </div>
  );
}

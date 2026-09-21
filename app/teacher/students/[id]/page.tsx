import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/security/guards";
import { teacherStudentDetail } from "@/lib/services/teacher-stats";
import { formatDay, formatWhen, scorePercent, studentStatus, STATUS_LABELS } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
import { Stat } from "@/components/teacher/stat";

export const metadata = { title: "Student — Teaching" };

const TONE = { TODO: "neutral", SUBMITTED: "primary", GRADED: "success", OVERDUE: "danger" } as const;

export default async function TeacherStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageRole(["TEACHER"]);
  // Only this teacher's own students; anyone else looks like a missing page.
  const d = teacherStudentDetail(user.id, id);
  if (!d) notFound();
  const p = d.profile;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/teacher/students" className="text-sm text-ink-soft hover:text-ink">
        ← Students
      </Link>
      <div>
        <h1 className="font-display text-2xl text-ink">{d.user.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {d.user.email}
          {d.batches.length > 0 && <> · Batches: {d.batches.map((b) => b.name).join(", ")}</>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="English level" value={p?.englishLevel ?? "—"} hint="From their placement test" />
        <Stat label="IELTS target" value={p?.ieltsTarget ?? "—"} hint={p?.targetExamDate ? `Exam ${formatDay(p.targetExamDate)}` : undefined} />
        <Stat label="Study streak" value={`${p?.streak ?? 0} days`} hint={`Last studied ${formatDay(p?.lastStudyDate)}`} />
        <Stat label="XP" value={p?.xp ?? 0} />
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Your courses</h2>
        {d.courses.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">Not enrolled in any of your courses.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {d.courses.map((c) => (
              <div key={c.courseId}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-ink">{c.title}</span>
                  <span className="text-xs text-ink-soft">
                    {c.completed}/{c.total} lessons · {c.quizAverage === null ? "no quizzes taken" : `quiz average ${c.quizAverage}% (${c.quizAttempts} attempts)`}
                  </span>
                </div>
                <ProgressBar value={c.percent} className="mt-1.5" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Assignments</h2>
        {d.assignments.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No assignments have been set for this student yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {d.assignments.map(({ assignment: a, submission: s }) => {
              const status = studentStatus(a, s);
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <Link href={`/teacher/assignments/${a.id}`} className="font-medium text-ink hover:text-primary">
                    {a.title}
                  </Link>
                  <span className="flex items-center gap-3 text-xs text-ink-soft">
                    {s?.status === "GRADED" && s.score != null && <span>{s.score}/{a.maxScore} ({scorePercent(s.score, a.maxScore)}%)</span>}
                    {s && <span>Submitted {formatWhen(s.submittedAt)}</span>}
                    <Badge tone={TONE[status]}>{STATUS_LABELS[status]}</Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

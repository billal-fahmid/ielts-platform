import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { requirePageRole } from "@/lib/security/guards";
import { teacherOverview } from "@/lib/services/teacher-stats";
import { formatWhen } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Stat } from "@/components/teacher/stat";

export default async function TeacherOverviewPage() {
  const user = await requirePageRole(["TEACHER"]);
  const o = teacherOverview(user.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Welcome, {user.name?.split(" ")[0] ?? "teacher"}</h1>
          <p className="mt-1 text-sm text-ink-soft">Your students, courses and assignments at a glance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/teacher/assignments/new" size="sm">
            <Plus className="h-4 w-4" /> New assignment
          </LinkButton>
          <LinkButton href="/teacher/batches" size="sm" variant="outline">
            Batches
          </LinkButton>
          <LinkButton href="/teacher/content/courses" size="sm" variant="outline">
            My courses
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Stat label="Students" value={o.students} hint={`${o.activeStudents} active this week`} href="/teacher/students" testId="stat-students" />
        <Stat label="Courses" value={o.courses} hint={`${o.publishedCourses} published`} href="/teacher/content/courses" testId="stat-courses" />
        <Stat label="Active batches" value={o.batches} href="/teacher/batches" testId="stat-batches" />
        <Stat label="Live assignments" value={o.openAssignments} href="/teacher/assignments" testId="stat-assignments" />
        <Stat label="To grade" value={o.toGrade} hint={o.toGrade ? "Students are waiting" : "All caught up"} href="/teacher/assignments" testId="stat-to-grade" />
        <Stat label="Writing reviews" value={o.reviewsWaiting} hint={`waiting in the queue${o.reviewsInProgress ? ` · ${o.reviewsInProgress} yours in progress` : ""}`} href="/teacher/reviews" testId="stat-reviews" />
        <Stat label="Speaking sessions" value={o.upcomingSessions} hint="booked and upcoming" href="/teacher/sessions" testId="stat-sessions" />
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Waiting for your review</h2>
        {o.needsGrading.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
            <ClipboardList className="h-4 w-4" /> No submissions are waiting. New ones appear here as students hand them in.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {o.needsGrading.map((r) => (
              <li key={r.submissionId}>
                <Link href={`/teacher/assignments/${r.assignmentId}#s-${r.submissionId}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm hover:text-primary">
                  <span>
                    <span className="font-medium text-ink">{r.student}</span> <span className="text-ink-soft">· {r.assignmentTitle}</span>
                  </span>
                  <span className="text-xs text-ink-soft">{formatWhen(r.submittedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-ink-soft">Live classes arrive in a later update and will appear here.</p>
    </div>
  );
}

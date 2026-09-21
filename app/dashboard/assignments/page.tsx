import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { auth } from "@/lib/auth";
import { assignmentsForStudent } from "@/lib/services/assignments";
import { formatDay, scorePercent, STATUS_LABELS } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Assignments — BanglaEnglish" };

const TONE = { TODO: "accent", SUBMITTED: "primary", GRADED: "success", OVERDUE: "danger" } as const;

export default async function AssignmentsPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const items = assignmentsForStudent(userId);
  const open = items.filter((r) => r.status === "TODO" || r.status === "OVERDUE");
  const done = items.filter((r) => r.status === "SUBMITTED" || r.status === "GRADED");

  const list = (rows: typeof items, testId: string) => (
    <div className="flex flex-col gap-3" data-testid={testId}>
      {rows.map(({ assignment: a, submission: s, status, teacherName }) => (
        <Link key={a.id} href={`/dashboard/assignments/${a.id}`}>
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-primary/40">
            <div className="min-w-0">
              <p className="font-medium text-ink">{a.title}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                From {teacherName} · {a.dueAt ? `Due ${formatDay(a.dueAt)}` : "No due date"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {s?.status === "GRADED" && s.score != null && (
                <span className="text-sm font-medium text-ink">
                  {s.score}/{a.maxScore} <span className="text-xs font-normal text-ink-soft">({scorePercent(s.score, a.maxScore)}%)</span>
                </span>
              )}
              <Badge tone={TONE[status]}>{STATUS_LABELS[status]}</Badge>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Assignments</h1>
        <p className="mt-1 text-sm text-ink-soft">Work set by your teachers. Hand it in, then read their feedback here.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No assignments yet" description="When a teacher adds you to a batch or you join one of their courses, their assignments will show up here." />
      ) : (
        <>
          {open.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg text-ink">To do</h2>
              {list(open, "assignments-open")}
            </section>
          )}
          {done.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-lg text-ink">Handed in</h2>
              {list(done, "assignments-done")}
            </section>
          )}
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import { UsersRound } from "lucide-react";
import { requirePageRole } from "@/lib/security/guards";
import { listBatches } from "@/lib/services/teaching";
import { listForTeacher } from "@/lib/services/teacher-content";
import { formatDay } from "@/lib/teaching/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { NewBatch } from "@/components/teacher/batch-controls";

export const metadata = { title: "Batches — Teaching" };

export default async function TeacherBatchesPage() {
  const user = await requirePageRole(["TEACHER"]);
  const batches = listBatches(user.id);
  const courses = (listForTeacher(user.id, "courses") as { id: string; title: string }[]).map((c) => ({ id: c.id, title: c.title }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Batches</h1>
          <p className="mt-1 text-sm text-ink-soft">Groups of students you teach together. Assign work to a whole batch at once.</p>
        </div>
      </div>
      <NewBatch courses={courses} />

      {batches.length === 0 ? (
        <EmptyState icon={UsersRound} title="No batches yet" description="Create your first batch, then add students by their email address." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2" data-testid="batch-list">
          {batches.map((b) => (
            <Link key={b.id} href={`/teacher/batches/${b.id}`}>
              <Card className="h-full p-5 transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-lg text-ink">{b.name}</h2>
                  <Badge tone={b.status === "ACTIVE" ? "success" : "neutral"}>{b.status === "ACTIVE" ? "Active" : "Archived"}</Badge>
                </div>
                {b.description && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{b.description}</p>}
                <p className="mt-3 text-sm text-ink">
                  {b.members} student{b.members === 1 ? "" : "s"}
                  {b.capacity ? ` of ${b.capacity}` : ""}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {b.courseTitle ? `${b.courseTitle} · ` : ""}
                  {b.startsOn ? `${formatDay(b.startsOn)}${b.endsOn ? ` – ${formatDay(b.endsOn)}` : ""}` : "No dates set"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

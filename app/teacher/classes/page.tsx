import Link from "next/link";
import { Video } from "lucide-react";
import { requirePageRole } from "@/lib/security/guards";
import { listTeacherClasses, sendDueReminders } from "@/lib/services/live-classes";
import { listBatches } from "@/lib/services/teaching";
import { listForTeacher } from "@/lib/services/teacher-content";
import { CLASS_STATE_LABELS, classState } from "@/lib/classes/rules";
import { formatSlotTime } from "@/lib/reviews/rules";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ClassForm } from "@/components/teacher/class-controls";

export const metadata = { title: "Live classes — Teaching" };

const TONE = { UPCOMING: "primary", LIVE: "success", FINISHED: "neutral", CANCELLED: "danger" } as const;

export default async function TeacherClassesPage() {
  const user = await requirePageRole(["TEACHER"]);
  sendDueReminders();
  const now = new Date();
  const all = listTeacherClasses(user.id);
  const upcoming = all.filter((c) => ["UPCOMING", "LIVE"].includes(classState(c, now)));
  const past = all.filter((c) => !upcoming.includes(c)).reverse();
  const batches = listBatches(user.id).filter((b) => b.status === "ACTIVE").map((b) => ({ id: b.id, label: b.name }));
  const courses = (listForTeacher(user.id, "courses") as { id: string; title: string }[]).map((c) => ({ id: c.id, label: c.title }));

  const row = (c: (typeof all)[number]) => {
    const state = classState(c, now);
    return (
      <Link key={c.id} href={`/teacher/classes/${c.id}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-primary-soft/40">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{c.title}</p>
          <p className="text-xs text-ink-soft">
            {formatSlotTime(c.startsAt)} · {c.durationMinutes} min · {c.audienceSize} student{c.audienceSize === 1 ? "" : "s"}
            {state === "FINISHED" || state === "LIVE" ? ` · ${c.attended} attended` : ""}
          </p>
        </div>
        <Badge tone={TONE[state]}>{CLASS_STATE_LABELS[state]}</Badge>
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Live classes</h1>
        <p className="mt-1 text-sm text-ink-soft">Schedule online classes for a batch or a course. Students on the Pro plan join with one button, attendance is recorded, and you add materials and the recording afterwards. All times are Bangladesh time.</p>
      </div>

      <Card className="p-5">
        <h2 className="font-display text-lg text-ink">Schedule a class</h2>
        {batches.length === 0 && courses.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            You need a batch or a course to teach. <Link href="/teacher/batches" className="text-primary underline">Create a batch</Link> first.
          </p>
        ) : (
          <div className="mt-4">
            <ClassForm batches={batches} courses={courses} />
          </div>
        )}
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState icon={Video} title="No upcoming classes" description="Schedule a class above and your students will be notified." />
        ) : (
          <Card className="divide-y divide-border p-0" data-testid="upcoming-classes">
            {upcoming.map(row)}
          </Card>
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Past</h2>
          <Card className="divide-y divide-border p-0" data-testid="past-classes">
            {past.map(row)}
          </Card>
        </section>
      )}
    </div>
  );
}

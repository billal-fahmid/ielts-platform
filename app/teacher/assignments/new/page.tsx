import Link from "next/link";
import { requirePageRole } from "@/lib/security/guards";
import { listBatches } from "@/lib/services/teaching";
import { listForTeacher } from "@/lib/services/teacher-content";
import { Card } from "@/components/ui/card";
import { AssignmentForm } from "@/components/teacher/assignment-controls";

export const metadata = { title: "New assignment — Teaching" };

export default async function NewAssignmentPage() {
  const user = await requirePageRole(["TEACHER"]);
  const batches = listBatches(user.id).filter((b) => b.status === "ACTIVE").map((b) => ({ id: b.id, label: b.name }));
  const courses = (listForTeacher(user.id, "courses") as { id: string; title: string }[]).map((c) => ({ id: c.id, label: c.title }));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link href="/teacher/assignments" className="text-sm text-ink-soft hover:text-ink">
        ← Assignments
      </Link>
      <h1 className="font-display text-2xl text-ink">New assignment</h1>
      {batches.length === 0 && courses.length === 0 ? (
        <Card className="p-5 text-sm text-ink-soft">
          You need a batch or a course to assign work to. <Link href="/teacher/batches" className="text-primary underline">Create a batch</Link> first.
        </Card>
      ) : (
        <Card className="p-5">
          <AssignmentForm batches={batches} courses={courses} />
        </Card>
      )}
    </div>
  );
}

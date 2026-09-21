import { notFound } from "next/navigation";
import { ResourceManager } from "@/components/admin/resource-manager";
import { canTeacherUse, OWNED_RESOURCES } from "@/lib/services/teacher-content";
import { Card } from "@/components/ui/card";

const HINTS: Record<string, string> = {
  courses: "Courses you create are yours: only you can edit them. Students enrol from the course page once it is published.",
  modules: "Modules group lessons inside one of your courses.",
  lessons: "Lessons can have text, uploaded video and audio, and a quiz.",
  quizzes: "A quiz belongs to one of your lessons. Add its questions under Quiz questions.",
  questions: "Multiple choice, true/false and fill-in-the-blank questions for your lesson quizzes.",
};

export default async function TeacherContentPage({ params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!canTeacherUse(resource)) notFound();
  const shared = !OWNED_RESOURCES.has(resource);

  return (
    <div className="flex flex-col gap-4">
      {(HINTS[resource] || shared) && (
        <Card className="bg-primary-soft/40 p-4 text-sm text-ink-soft">
          {shared ? "This is shared platform content: what you add here is visible to every teacher and student, and it counts toward the question bank." : HINTS[resource]}
        </Card>
      )}
      <ResourceManager resourceKey={resource} apiBase="/api/teacher" teacher />
    </div>
  );
}

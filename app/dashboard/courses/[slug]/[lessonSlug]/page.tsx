import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getLessonBySlug, getModuleById, isLessonCompleted, isBookmarked, getLessonsForModule } from "@/lib/services/courses";
import { getCourseBySlug } from "@/lib/services/courses";
import { getQuizByLesson, getQuestions } from "@/lib/services/quiz";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Video, Volume2 } from "lucide-react";
import { LessonActions } from "./lesson-actions";
import { QuizSection } from "@/components/quiz/quiz-section";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonSlug: string }>;
}) {
  const { slug, lessonSlug } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;

  const course = getCourseBySlug(slug);
  const lesson = getLessonBySlug(lessonSlug);
  if (!course || !lesson) notFound();

  const module = getModuleById(lesson.moduleId);
  const siblings = module ? getLessonsForModule(module.id).sort((a, b) => a.order - b.order) : [];
  const idx = siblings.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const completed = isLessonCompleted(userId, lesson.id);
  const bookmarked = isBookmarked(userId, lesson.id);

  const quiz = getQuizByLesson(lesson.id);
  const questions = quiz ? getQuestions(quiz.id) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/dashboard/courses/${course.slug}`}
        className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {course.title}
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <Badge tone="primary">{module?.title}</Badge>
        {completed && <Badge tone="success">Completed</Badge>}
      </div>
      <h1 className="mt-2 font-display text-2xl text-ink">{lesson.title}</h1>
      <p className="mt-1.5 text-sm text-ink-soft">{lesson.description}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-ink-soft">
          <Video className="h-5 w-5 shrink-0" /> Video placeholder
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-sm text-ink-soft">
          <Volume2 className="h-5 w-5 shrink-0" /> Audio placeholder
        </div>
      </div>

      <div className="prose prose-sm mt-6 max-w-none whitespace-pre-line text-[15px] leading-7 text-ink">
        {lesson.content}
      </div>

      {lesson.examples && lesson.examples.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-lg text-ink">Examples</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {lesson.examples.map((ex, i) => (
              <li key={i} className="rounded-lg bg-primary-soft px-4 py-2.5 text-sm text-ink">
                {ex}
              </li>
            ))}
          </ul>
        </div>
      )}

      <LessonActions lessonId={lesson.id} initialCompleted={completed} initialBookmarked={bookmarked} />

      {questions.length > 0 && quiz && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg text-ink">Check your understanding</h2>
          <QuizSection
            quizId={quiz.id}
            questions={questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options }))}
          />
        </div>
      )}

      <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
        {prev ? (
          <Link
            href={`/dashboard/courses/${course.slug}/${prev.slug}`}
            className="flex items-center gap-1.5 text-sm font-medium text-ink hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/dashboard/courses/${course.slug}/${next.slug}`}
            className="flex items-center gap-1.5 text-sm font-medium text-ink hover:text-primary"
          >
            {next.title} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

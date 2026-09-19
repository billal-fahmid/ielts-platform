import { notFound } from "next/navigation";
import Link from "next/link";
import { getGrammarTopicBySlug, listGrammarTopics } from "@/lib/services/grammar";
import { getQuizByGrammarTopic, getQuestions } from "@/lib/services/quiz";
import { QuizSection } from "@/components/quiz/quiz-section";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default async function GrammarTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = getGrammarTopicBySlug(slug);
  if (!topic) notFound();

  const all = listGrammarTopics();
  const idx = all.findIndex((t) => t.id === topic.id);
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  const quiz = getQuizByGrammarTopic(topic.id);
  const questions = quiz ? getQuestions(quiz.id) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/grammar" className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" /> Grammar Lab
      </Link>

      <h1 className="mt-4 font-display text-2xl text-ink">{topic.title}</h1>

      <section className="mt-6">
        <h2 className="font-display text-lg text-ink">Learn</h2>
        <p className="mt-2 text-[15px] leading-7 text-ink">{topic.explanation}</p>
      </section>

      {topic.examples && topic.examples.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-lg text-ink">Examples</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {topic.examples.map((ex, i) => (
              <li key={i} className="rounded-lg bg-primary-soft px-4 py-2.5 text-sm text-ink">
                {ex}
              </li>
            ))}
          </ul>
        </section>
      )}

      {questions.length > 0 && quiz && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg text-ink">Practice</h2>
          <QuizSection
            quizId={quiz.id}
            questions={questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options }))}
          />
        </section>
      )}

      {next && (
        <div className="mt-10 flex justify-end border-t border-border pt-6">
          <Link
            href={`/dashboard/grammar/${next.slug}`}
            className="flex items-center gap-1.5 text-sm font-medium text-ink hover:text-primary"
          >
            Next: {next.title} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

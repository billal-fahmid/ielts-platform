import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPassage, getQuestionsForPassage, startOrResumeAttempt } from "@/lib/services/reading";
import { ReadingRunner } from "@/components/ielts/reading-runner";
import type { RunnerQuestion } from "@/components/ielts/question-renderer";

export default async function ReadingTestPage({ params }: { params: Promise<{ passageId: string }> }) {
  const { passageId } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;

  const passage = getPassage(passageId);
  if (!passage || !passage.published) notFound();

  const questions = getQuestionsForPassage(passageId);
  const attempt = startOrResumeAttempt(userId, passageId);

  // Never send correctAnswer/explanation to the client before submission.
  const runnerQuestions: RunnerQuestion[] = questions.map((q) => ({
    id: q.id,
    questionType: q.questionType,
    prompt: q.prompt,
    content: q.content as Record<string, unknown>,
    order: q.order,
    points: q.points,
  }));

  return (
    <ReadingRunner
      attemptId={attempt.id}
      passage={{
        title: passage.title,
        testType: passage.testType,
        timeLimitSeconds: passage.timeLimitSeconds,
        bodyText: passage.bodyText,
      }}
      questions={runnerQuestions}
      initialAnswers={(attempt.answers as Record<string, unknown>) ?? {}}
      initialTimeSpentSeconds={attempt.timeSpentSeconds}
    />
  );
}

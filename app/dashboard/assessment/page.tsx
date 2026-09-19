import { getAssessmentQuiz, getQuestions } from "@/lib/services/quiz";
import { AssessmentRunner } from "./assessment-runner";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";

export default function AssessmentPage() {
  const quiz = getAssessmentQuiz();
  const questions = quiz ? getQuestions(quiz.id) : [];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <h1 className="font-display text-2xl text-ink">English Placement Assessment</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {questions.length} questions covering Grammar, Vocabulary, Reading, and Listening.
        </p>
        <div className="mt-3 flex justify-center gap-1.5">
          <Badge tone="primary">Grammar</Badge>
          <Badge tone="accent">Vocabulary</Badge>
          <Badge tone="success">Reading</Badge>
          <Badge tone="neutral">Listening</Badge>
        </div>
      </div>
      <AssessmentRunner
        questions={questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options }))}
      />
    </div>
  );
}

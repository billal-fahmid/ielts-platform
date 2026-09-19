/**
 * Shape of `ieltsQuestions.content` / `correctAnswer` per questionType, and the shape of a
 * student's answer for that type (as stored in `ieltsAttempts.answers`, keyed by question id).
 * Shared between grading (lib/services/reading.ts, lib/services/listening.ts) and the runner UI
 * (components/ielts/question-renderer.tsx) so both sides agree on the contract.
 */

export type McqSingleContent = { options: string[] };
export type McqMultiContent = { options: string[]; selectCount: number };
export type MatchingContent = { items: string[]; options: string[] };
export type CompletionContent = { wordLimit: number };
export type MapLabelingContent = { imageUrl: string; labels: string[] };
export type ShortAnswerContent = { wordLimit: number };

export type McqSingleAnswer = string;
export type McqMultiAnswer = string[];
export type MatchingAnswer = Record<string, string>;
export type TrueFalseAnswer = "TRUE" | "FALSE" | "NOT_GIVEN";
export type YesNoAnswer = "YES" | "NO" | "NOT_GIVEN";
export type CompletionAnswer = string;
export type MapLabelingAnswer = string;
export type ShortAnswerAnswer = string;

export const TRUE_FALSE_OPTIONS: TrueFalseAnswer[] = ["TRUE", "FALSE", "NOT_GIVEN"];
export const YES_NO_OPTIONS: YesNoAnswer[] = ["YES", "NO", "NOT_GIVEN"];

function normalize(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

/** Returns true if the student's answer is correct for the given question type. */
export function isAnswerCorrect(questionType: string, correctAnswer: unknown, studentAnswer: unknown): boolean {
  if (studentAnswer === undefined || studentAnswer === null || studentAnswer === "") return false;

  switch (questionType) {
    case "MCQ_MULTI": {
      const correct = (correctAnswer as string[]) ?? [];
      const given = (studentAnswer as string[]) ?? [];
      if (correct.length !== given.length) return false;
      const correctSet = new Set(correct.map(normalize));
      return given.every((g) => correctSet.has(normalize(g)));
    }
    case "MATCHING": {
      const correct = (correctAnswer as Record<string, string>) ?? {};
      const given = (studentAnswer as Record<string, string>) ?? {};
      const keys = Object.keys(correct);
      if (keys.length === 0) return false;
      return keys.every((k) => normalize(correct[k]) === normalize(given[k]));
    }
    case "SHORT_ANSWER":
    case "FORM_COMPLETION":
    case "SENTENCE_COMPLETION":
    case "SUMMARY_COMPLETION": {
      const acceptable = Array.isArray(correctAnswer) ? (correctAnswer as string[]) : [String(correctAnswer)];
      return acceptable.some((a) => normalize(a) === normalize(studentAnswer));
    }
    default:
      // MCQ_SINGLE, TRUE_FALSE_NOT_GIVEN, YES_NO_NOT_GIVEN, MAP_LABELING
      return normalize(correctAnswer) === normalize(studentAnswer);
  }
}

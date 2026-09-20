import { db } from "@/lib/db";
import { ieltsQuestions, readingPassages, listeningSections, listeningTests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { validateQuestion, type NormalizedQuestion } from "@/lib/ielts/question-validation";

export type QuestionRow = {
  id: string;
  skill: "LISTENING" | "READING";
  questionType: string;
  prompt: string;
  difficulty: string;
  topic: string | null;
  tags: string[];
  points: number;
  order: number;
  published: boolean;
  parentLabel: string;
};

export type ParentOptions = {
  passages: { id: string; label: string }[];
  sections: { id: string; label: string }[];
};

function passageLabel(p: { passageNumber: number; title: string; testType: string }) {
  return `Passage ${p.passageNumber}: ${p.title} (${p.testType === "GENERAL_TRAINING" ? "General Training" : "Academic"})`;
}

export function listParents(): ParentOptions {
  const tests = new Map(db.select().from(listeningTests).all().map((t) => [t.id, t.title]));
  return {
    passages: db
      .select()
      .from(readingPassages)
      .all()
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((p) => ({ id: p.id, label: passageLabel(p) })),
    sections: db
      .select()
      .from(listeningSections)
      .all()
      .sort((a, b) => (tests.get(a.listeningTestId) ?? "").localeCompare(tests.get(b.listeningTestId) ?? "") || a.sectionNumber - b.sectionNumber)
      .map((s) => ({ id: s.id, label: `${tests.get(s.listeningTestId) ?? "(missing test)"} — Section ${s.sectionNumber}` })),
  };
}

export function listQuestionRows(): QuestionRow[] {
  const parents = listParents();
  const labels = new Map([...parents.passages, ...parents.sections].map((p) => [p.id, p.label]));
  return db
    .select()
    .from(ieltsQuestions)
    .all()
    .map((q) => ({
      id: q.id,
      skill: q.skill,
      questionType: q.questionType,
      prompt: q.prompt,
      difficulty: q.difficulty,
      topic: q.topic,
      tags: q.tags ?? [],
      points: q.points,
      order: q.order,
      published: q.published,
      parentLabel: labels.get((q.passageId ?? q.listeningSectionId) ?? "") ?? "(missing parent)",
    }))
    .sort((a, b) => a.skill.localeCompare(b.skill) || a.parentLabel.localeCompare(b.parentLabel) || a.order - b.order);
}

export function getQuestion(questionId: string) {
  return db.select().from(ieltsQuestions).where(eq(ieltsQuestions.id, questionId)).get();
}

/** A question is only valid if its parent exists, so a student never opens a question with no passage/audio. */
function parentError(q: NormalizedQuestion): string | null {
  if (q.skill === "READING") {
    return db.select().from(readingPassages).where(eq(readingPassages.id, q.passageId!)).get() ? null : "That reading passage no longer exists.";
  }
  return db.select().from(listeningSections).where(eq(listeningSections.id, q.listeningSectionId!)).get()
    ? null
    : "That listening section no longer exists.";
}

export type SaveResult = { ok: true; id: string } | { ok: false; errors: string[] };

export function createQuestion(input: unknown): SaveResult {
  const result = validateQuestion(input);
  if (!result.ok) return result;
  const problem = parentError(result.value);
  if (problem) return { ok: false, errors: [problem] };

  const questionId = newId();
  db.insert(ieltsQuestions).values({ id: questionId, ...result.value }).run();
  return { ok: true, id: questionId };
}

export function updateQuestion(questionId: string, input: unknown): SaveResult {
  if (!getQuestion(questionId)) return { ok: false, errors: ["Question not found."] };
  const result = validateQuestion(input);
  if (!result.ok) return result;
  const problem = parentError(result.value);
  if (problem) return { ok: false, errors: [problem] };

  db.update(ieltsQuestions).set(result.value).where(eq(ieltsQuestions.id, questionId)).run();
  return { ok: true, id: questionId };
}

/** Publishing re-validates the stored question, so legacy or hand-edited rows can't go live half-broken. */
export function setQuestionPublished(questionId: string, published: boolean): SaveResult {
  const row = getQuestion(questionId);
  if (!row) return { ok: false, errors: ["Question not found."] };

  if (published) {
    const result = validateQuestion({ ...row, tags: row.tags ?? [], published: true });
    if (!result.ok) return { ok: false, errors: ["This question is incomplete, so it can't be published yet.", ...result.errors] };
    const problem = parentError(result.value);
    if (problem) return { ok: false, errors: [problem] };
  }

  db.update(ieltsQuestions).set({ published }).where(eq(ieltsQuestions.id, questionId)).run();
  return { ok: true, id: questionId };
}

export function deleteQuestion(questionId: string): boolean {
  if (!getQuestion(questionId)) return false;
  db.delete(ieltsQuestions).where(eq(ieltsQuestions.id, questionId)).run();
  return true;
}

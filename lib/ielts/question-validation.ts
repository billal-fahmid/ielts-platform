/**
 * Validation and normalisation for question-bank entries. Pure (no database access) so the admin
 * editor can show the same errors live that the server enforces on save. The normalised
 * `content` / `correctAnswer` shapes are exactly what lib/ielts/question-types.ts grades and
 * components/ielts/question-renderer.tsx renders.
 */
import { TRUE_FALSE_OPTIONS, YES_NO_OPTIONS } from "./question-types";

export const QUESTION_TYPES = [
  "MCQ_SINGLE",
  "MCQ_MULTI",
  "MATCHING",
  "TRUE_FALSE_NOT_GIVEN",
  "YES_NO_NOT_GIVEN",
  "FORM_COMPLETION",
  "SENTENCE_COMPLETION",
  "SUMMARY_COMPLETION",
  "MAP_LABELING",
  "SHORT_ANSWER",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MCQ_SINGLE: "Multiple choice (one answer)",
  MCQ_MULTI: "Multiple choice (several answers)",
  MATCHING: "Matching",
  TRUE_FALSE_NOT_GIVEN: "True / False / Not Given",
  YES_NO_NOT_GIVEN: "Yes / No / Not Given",
  FORM_COMPLETION: "Form completion",
  SENTENCE_COMPLETION: "Sentence completion",
  SUMMARY_COMPLETION: "Summary completion",
  MAP_LABELING: "Map / diagram labelling",
  SHORT_ANSWER: "Short answer",
};

export const SKILLS = ["LISTENING", "READING"] as const;
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export type QuestionInput = {
  skill?: unknown;
  passageId?: unknown;
  listeningSectionId?: unknown;
  questionType?: unknown;
  prompt?: unknown;
  difficulty?: unknown;
  topic?: unknown;
  tags?: unknown;
  points?: unknown;
  order?: unknown;
  explanation?: unknown;
  published?: unknown;
  content?: unknown;
  correctAnswer?: unknown;
};

export type NormalizedQuestion = {
  skill: (typeof SKILLS)[number];
  passageId: string | null;
  listeningSectionId: string | null;
  questionType: QuestionType;
  prompt: string;
  difficulty: (typeof DIFFICULTIES)[number];
  topic: string | null;
  tags: string[];
  points: number;
  order: number;
  explanation: string | null;
  published: boolean;
  content: Record<string, unknown>;
  correctAnswer: unknown;
};

export type ValidationResult = { ok: true; value: NormalizedQuestion } | { ok: false; errors: string[] };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Trims, drops blanks. Non-arrays become an empty list. */
function cleanList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
}

function findDuplicate(list: string[]): string | null {
  const seen = new Set<string>();
  for (const item of list) {
    const key = item.toLowerCase();
    if (seen.has(key)) return item;
    seen.add(key);
  }
  return null;
}

function isSafeUrl(url: string) {
  return /^\/(?!\/)/.test(url) || /^https?:\/\//i.test(url);
}

function cleanTags(v: unknown): string[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  const tags = raw.map((t) => (typeof t === "string" ? t.trim().toLowerCase() : "")).filter(Boolean);
  return [...new Set(tags)];
}

function intInRange(v: unknown, min: number, max: number, fallback: number): number | null {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

/** Type-specific rules. Returns the normalised content/correctAnswer or a list of problems. */
function validateByType(
  type: QuestionType,
  contentRaw: unknown,
  correctRaw: unknown
): { content: Record<string, unknown>; correctAnswer: unknown } | { errors: string[] } {
  const content = isRecord(contentRaw) ? contentRaw : {};
  const errors: string[] = [];

  switch (type) {
    case "MCQ_SINGLE": {
      const options = cleanList(content.options);
      if (options.length < 2) errors.push("Add at least 2 answer options.");
      const dup = findDuplicate(options);
      if (dup) errors.push(`Answer options must be different (“${dup}” appears twice).`);
      const correct = typeof correctRaw === "string" ? correctRaw.trim() : "";
      if (!correct) errors.push("Choose the correct option.");
      else if (!options.includes(correct)) errors.push("The correct answer must be one of the options.");
      return errors.length ? { errors } : { content: { options }, correctAnswer: correct };
    }

    case "MCQ_MULTI": {
      const options = cleanList(content.options);
      if (options.length < 3) errors.push("Add at least 3 answer options.");
      const dup = findDuplicate(options);
      if (dup) errors.push(`Answer options must be different (“${dup}” appears twice).`);
      const correct = [...new Set(cleanList(correctRaw))];
      if (correct.length < 2) errors.push("Choose at least 2 correct options.");
      else if (correct.some((c) => !options.includes(c))) errors.push("Every correct answer must be one of the options.");
      else if (correct.length >= options.length) errors.push("At least one option must be incorrect.");
      return errors.length ? { errors } : { content: { options, selectCount: correct.length }, correctAnswer: correct };
    }

    case "MATCHING": {
      const items = cleanList(content.items);
      const options = cleanList(content.options);
      if (items.length < 2) errors.push("Add at least 2 items to match.");
      if (options.length < 2) errors.push("Add at least 2 options to match against.");
      const dupItem = findDuplicate(items);
      if (dupItem) errors.push(`Items must be different (“${dupItem}” appears twice).`);
      const dupOption = findDuplicate(options);
      if (dupOption) errors.push(`Options must be different (“${dupOption}” appears twice).`);
      const map = isRecord(correctRaw) ? correctRaw : {};
      const correct: Record<string, string> = {};
      for (const item of items) {
        const chosen = typeof map[item] === "string" ? (map[item] as string).trim() : "";
        if (!chosen) errors.push(`Choose the correct match for “${item}”.`);
        else if (!options.includes(chosen)) errors.push(`The match for “${item}” must be one of the options.`);
        else correct[item] = chosen;
      }
      return errors.length ? { errors } : { content: { items, options }, correctAnswer: correct };
    }

    case "TRUE_FALSE_NOT_GIVEN":
    case "YES_NO_NOT_GIVEN": {
      const allowed: string[] = type === "TRUE_FALSE_NOT_GIVEN" ? TRUE_FALSE_OPTIONS : YES_NO_OPTIONS;
      const correct = typeof correctRaw === "string" ? correctRaw.trim().toUpperCase() : "";
      if (!allowed.includes(correct)) errors.push(`Choose the correct answer: ${allowed.join(", ").replace(/_/g, " ")}.`);
      return errors.length ? { errors } : { content: {}, correctAnswer: correct };
    }

    case "FORM_COMPLETION":
    case "SENTENCE_COMPLETION":
    case "SUMMARY_COMPLETION":
    case "SHORT_ANSWER": {
      const wordLimit = intInRange(content.wordLimit, 1, 10, 2);
      if (wordLimit === null) errors.push("The word limit must be a whole number from 1 to 10.");
      const answers = Array.isArray(correctRaw) ? cleanList(correctRaw) : cleanList([correctRaw]);
      const unique: string[] = [];
      const seen = new Set<string>();
      for (const a of answers) {
        if (!seen.has(a.toLowerCase())) {
          seen.add(a.toLowerCase());
          unique.push(a);
        }
      }
      if (unique.length === 0) errors.push("Enter at least one accepted answer.");
      if (wordLimit !== null) {
        const tooLong = unique.find((a) => a.split(/\s+/).length > wordLimit);
        if (tooLong) errors.push(`The accepted answer “${tooLong}” is longer than the ${wordLimit}-word limit.`);
      }
      return errors.length ? { errors } : { content: { wordLimit }, correctAnswer: unique.length === 1 ? unique[0] : unique };
    }

    case "MAP_LABELING": {
      const imageUrl = typeof content.imageUrl === "string" ? content.imageUrl.trim() : "";
      const labels = cleanList(content.labels);
      if (!imageUrl) errors.push("Add the image path or URL for the map or diagram.");
      else if (!isSafeUrl(imageUrl)) errors.push("The image must be a path starting with “/” or a full http(s) URL.");
      if (labels.length < 2) errors.push("Add at least 2 labels.");
      const dup = findDuplicate(labels);
      if (dup) errors.push(`Labels must be different (“${dup}” appears twice).`);
      const correct = typeof correctRaw === "string" ? correctRaw.trim() : "";
      if (!correct) errors.push("Choose the correct label.");
      else if (!labels.includes(correct)) errors.push("The correct label must be one of the labels.");
      return errors.length ? { errors } : { content: { imageUrl, labels }, correctAnswer: correct };
    }
  }
}

export function validateQuestion(input: unknown): ValidationResult {
  if (!isRecord(input)) return { ok: false, errors: ["Invalid question data."] };
  const errors: string[] = [];

  const skill = input.skill;
  if (skill !== "LISTENING" && skill !== "READING") errors.push("Choose Listening or Reading.");

  const passageId = typeof input.passageId === "string" && input.passageId ? input.passageId : null;
  const listeningSectionId = typeof input.listeningSectionId === "string" && input.listeningSectionId ? input.listeningSectionId : null;
  if (skill === "READING" && !passageId) errors.push("Choose the reading passage this question belongs to.");
  if (skill === "LISTENING" && !listeningSectionId) errors.push("Choose the listening section this question belongs to.");

  const type = input.questionType;
  const typeValid = typeof type === "string" && (QUESTION_TYPES as readonly string[]).includes(type);
  if (!typeValid) errors.push("Choose a question type.");

  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  if (prompt.length < 3) errors.push("Write the question or instruction (at least 3 characters).");
  if (prompt.length > 1000) errors.push("The question is too long (1000 characters maximum).");

  const difficulty = input.difficulty === undefined || input.difficulty === "" ? "MEDIUM" : input.difficulty;
  if (!(DIFFICULTIES as readonly string[]).includes(difficulty as string)) errors.push("Choose a difficulty.");

  const topic = typeof input.topic === "string" ? input.topic.trim() : "";
  if (topic.length > 80) errors.push("The topic is too long (80 characters maximum).");

  const tags = cleanTags(input.tags);
  if (tags.length > 10) errors.push("Use at most 10 tags.");
  if (tags.some((t) => t.length > 30)) errors.push("Each tag must be 30 characters or fewer.");

  const points = intInRange(input.points, 1, 10, 1);
  if (points === null) errors.push("Points must be a whole number from 1 to 10.");
  const order = intInRange(input.order, 0, 999, 0);
  if (order === null) errors.push("Order must be a whole number from 0 to 999.");

  const explanation = typeof input.explanation === "string" ? input.explanation.trim() : "";
  if (explanation.length > 2000) errors.push("The explanation is too long (2000 characters maximum).");

  let body: { content: Record<string, unknown>; correctAnswer: unknown } | null = null;
  if (typeValid) {
    const result = validateByType(type as QuestionType, input.content, input.correctAnswer);
    if ("errors" in result) errors.push(...result.errors);
    else body = result;
  }

  if (errors.length > 0 || !body) return { ok: false, errors };

  return {
    ok: true,
    value: {
      skill: skill as NormalizedQuestion["skill"],
      passageId: skill === "READING" ? passageId : null,
      listeningSectionId: skill === "LISTENING" ? listeningSectionId : null,
      questionType: type as QuestionType,
      prompt,
      difficulty: difficulty as NormalizedQuestion["difficulty"],
      topic: topic || null,
      tags,
      points: points as number,
      order: order as number,
      explanation: explanation || null,
      published: input.published === true,
      content: body.content,
      correctAnswer: body.correctAnswer,
    },
  };
}

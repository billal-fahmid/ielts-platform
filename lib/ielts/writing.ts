/** Client-safe writing constants and helpers (no database access). */

export type TaskType = "TASK1" | "TASK2";

export const WRITING_CATEGORY_LABELS: Record<string, string> = {
  GRAPH: "Graph",
  CHART: "Chart",
  TABLE: "Table",
  MAP: "Map",
  PROCESS: "Process",
  OPINION: "Opinion",
  DISCUSSION: "Discussion",
  ADVANTAGE_DISADVANTAGE: "Advantages / disadvantages",
  PROBLEM_SOLUTION: "Problem / solution",
  TWO_PART: "Two-part question",
};

export const MIN_WORDS: Record<TaskType, number> = { TASK1: 150, TASK2: 250 };
export const SUGGESTED_MINUTES: Record<TaskType, number> = { TASK1: 20, TASK2: 40 };

/** Below this an essay isn't worth sending for AI feedback. */
export const MIN_SUBMIT_WORDS = 30;
export const MAX_ESSAY_CHARS = 10000;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** The first criterion is named differently in Task 1 and Task 2. */
export function taskCriterionLabel(taskType: TaskType): string {
  return taskType === "TASK1" ? "Task Achievement" : "Task Response";
}

export const TASK1_CATEGORIES = ["GRAPH", "CHART", "TABLE", "MAP", "PROCESS"];
export const TASK2_CATEGORIES = ["OPINION", "DISCUSSION", "ADVANTAGE_DISADVANTAGE", "PROBLEM_SOLUTION", "TWO_PART"];

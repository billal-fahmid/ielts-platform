import { db } from "@/lib/db";
import { ieltsAttempts, studyPlans, vocabulary, writingSubmissions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { getProfile } from "@/lib/services/users";
import * as listening from "@/lib/services/listening";
import * as reading from "@/lib/services/reading";
import * as writing from "@/lib/services/writing";
import { listGrammarTopics } from "@/lib/services/grammar";
import { listPublishedMockTests } from "@/lib/services/mock-test";
import { gatherAnalysis } from "@/lib/services/recommendations";
import { WRITING_CATEGORY_LABELS } from "@/lib/ielts/writing";
import { buildPlan, type Catalog, type PlanDay } from "@/lib/ielts/plan-builder";
import type { Analysis } from "@/lib/ielts/recommendation-rules";
import { writeCoachNotes } from "@/lib/ai/study-plan";
import { getAIProvider } from "@/lib/ai/provider";
import type { AIProvider, AIResult } from "@/lib/ai/types";

export type StudyPlan = Omit<typeof studyPlans.$inferSelect, "days"> & { days: PlanDay[] };

const shorten = (text: string, max: number) => {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > max ? one.slice(0, max - 1).trimEnd() + "…" : one;
};

/** The published content a plan may point at, with what this student has already done. */
export function gatherCatalog(userId: string): Catalog {
  const attempts = db
    .select()
    .from(ieltsAttempts)
    .where(and(eq(ieltsAttempts.userId, userId), eq(ieltsAttempts.status, "COMPLETED")))
    .all()
    .sort((a, b) => (b.completedAt || "").localeCompare(a.completedAt || ""));
  const latest = (pick: (a: (typeof attempts)[number]) => string | null, id: string) => attempts.find((a) => pick(a) === id);

  const submitted = new Set(
    db
      .select()
      .from(writingSubmissions)
      .where(eq(writingSubmissions.userId, userId))
      .all()
      .filter((s) => s.status !== "DRAFT" && s.promptId)
      .map((s) => s.promptId!)
  );
  const prompts = writing.listPublishedPrompts().map((p) => ({
    taskType: p.taskType,
    item: {
      id: p.id,
      title: `${WRITING_CATEGORY_LABELS[p.category] ?? p.category}: ${shorten(p.promptText.split("\n")[0], 60)}`,
      done: submitted.has(p.id),
    },
  }));

  return {
    listening: listening.listPublishedTests().map((t) => {
      const last = latest((a) => a.listeningTestId, t.id);
      return { id: t.id, title: t.title, minutes: Math.round(t.timeLimitSeconds / 60), done: !!last, lastBand: last?.bandScore ?? null };
    }),
    reading: reading.listPublishedPassages().map((p) => {
      const last = latest((a) => a.readingPassageId, p.id);
      return { id: p.id, title: p.title, minutes: Math.round(p.timeLimitSeconds / 60), done: !!last, lastBand: last?.bandScore ?? null };
    }),
    writingTask1: prompts.filter((p) => p.taskType === "TASK1").map((p) => p.item),
    writingTask2: prompts.filter((p) => p.taskType === "TASK2").map((p) => p.item),
    grammar: listGrammarTopics().map((g) => ({ slug: g.slug, title: g.title })),
    hasVocabulary: db.select().from(vocabulary).all().length > 0,
    mock: (() => {
      const m = listPublishedMockTests()[0];
      return m ? { id: m.id, title: m.title } : null;
    })(),
  };
}

function parse(row: typeof studyPlans.$inferSelect): StudyPlan {
  return { ...row, days: (row.days ?? []) as unknown as PlanDay[] };
}

export function getLatestPlan(userId: string): StudyPlan | null {
  const row = db
    .select()
    .from(studyPlans)
    .where(eq(studyPlans.userId, userId))
    .all()
    .sort((a, b) => (b.generatedAt || "").localeCompare(a.generatedAt || "") || b.id.localeCompare(a.id))[0];
  return row ? parse(row) : null;
}

export function getPlan(planId: string): StudyPlan | null {
  const row = db.select().from(studyPlans).where(eq(studyPlans.id, planId)).get();
  return row ? parse(row) : null;
}

/** The task list for today, or the next unfinished day. Null once the week is over and nothing is left. */
export function todaysDay(plan: StudyPlan, now: Date = new Date()): PlanDay | null {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return plan.days.find((d) => d.date === today) ?? plan.days.find((d) => d.date > today) ?? null;
}

const inFlight = new Set<string>();

/**
 * Builds a new 7-day plan from the student's data and adds AI coach notes when the AI is available.
 * The plan is saved first, so a busy or missing AI never blocks it.
 */
export async function generateStudyPlan(
  userId: string,
  provider: AIProvider = getAIProvider(),
  analysis: Analysis = gatherAnalysis(userId)
): Promise<{ plan: StudyPlan; notes: AIResult<unknown> | { ok: false; reason: "error"; message: string } }> {
  const days = buildPlan(analysis, gatherCatalog(userId));
  const planId = newId();
  db.insert(studyPlans)
    .values({
      id: planId,
      userId,
      generatedAt: new Date().toISOString(), // millisecond precision, so the newest plan is always unambiguous
      targetExamDate: getProfile(userId)?.targetExamDate ?? null,
      days: days as unknown as Record<string, unknown>[],
      aiAssisted: false,
    })
    .run();
  const notes = await addCoachNotes(planId, provider, analysis);
  return { plan: getPlan(planId)!, notes };
}

/** Asks the AI for coach notes and stores them next to the plan. Safe to call again after a failure. */
export async function addCoachNotes(planId: string, provider: AIProvider = getAIProvider(), analysis?: Analysis) {
  const plan = getPlan(planId);
  if (!plan) return { ok: false as const, reason: "error" as const, message: "Plan not found." };
  if (plan.aiAssisted) return { ok: true as const, data: null };
  if (inFlight.has(planId)) return { ok: false as const, reason: "error" as const, message: "Coach notes are already being written." };

  inFlight.add(planId);
  try {
    const result = await writeCoachNotes({ analysis: analysis ?? gatherAnalysis(plan.userId), days: plan.days }, provider);
    if (!result.ok) return result;

    // Re-read so ticks the student made while the AI was thinking aren't overwritten.
    const current = getPlan(planId)!;
    const days = current.days.map((d) => (result.data.tips.has(d.day) ? { ...d, note: result.data.tips.get(d.day) } : d));
    db.update(studyPlans)
      .set({ days: days as unknown as Record<string, unknown>[], summary: result.data.summary || null, aiAssisted: true })
      .where(eq(studyPlans.id, planId))
      .run();
    return { ok: true as const, data: null };
  } finally {
    inFlight.delete(planId);
  }
}

/** Ticks or unticks a task. Returns the updated plan, or null if the plan or task isn't this student's. */
export function setTaskCompleted(userId: string, planId: string, taskId: string, completed: boolean): StudyPlan | null {
  const plan = getPlan(planId);
  if (!plan || plan.userId !== userId) return null;
  let found = false;
  const days = plan.days.map((d) => ({
    ...d,
    tasks: d.tasks.map((t) => {
      if (t.id !== taskId) return t;
      found = true;
      return { ...t, completed };
    }),
  }));
  if (!found) return null;
  db.update(studyPlans)
    .set({ days: days as unknown as Record<string, unknown>[] })
    .where(eq(studyPlans.id, planId))
    .run();
  return getPlan(planId);
}

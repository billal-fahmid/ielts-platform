/**
 * Builds the 7-day study plan from rules and real content. The AI never chooses tasks or links:
 * it only adds coach notes afterwards (see lib/ai/study-plan.ts), so every task in a plan is
 * something that exists on the platform. Pure functions: no database, no AI.
 */
import { SKILL_KEYS, SKILL_LABELS, SKILL_URLS, WRITING_CRITERIA, SPEAKING_CRITERIA, bandGap, type Analysis, type SkillKey } from "./recommendation-rules";

export type PlanTaskType = "LISTENING" | "READING" | "WRITING" | "SPEAKING" | "VOCABULARY" | "GRAMMAR" | "TUTOR" | "MOCK";

export type PlanTask = {
  id: string;
  type: PlanTaskType;
  /** The listening test, passage, prompt or topic this task points at. */
  refId: string | null;
  title: string;
  url: string;
  durationMinutes: number;
  completed: boolean;
};

export type PlanDay = {
  day: number;
  /** YYYY-MM-DD */
  date: string;
  focusSkill: SkillKey | "FOUNDATIONS" | "CHECKPOINT";
  focus: string;
  /** Why this day was chosen, written from the student's own data. */
  reason: string;
  /** Coach tip added by the AI; absent for rule-based plans. */
  note?: string;
  tasks: PlanTask[];
};

type Item = { id: string; title: string; minutes: number; done: boolean; lastBand: number | null };
type PromptItem = { id: string; title: string; done: boolean };

/** What the plan can point at. Only published content belongs here. */
export type Catalog = {
  listening: Item[];
  reading: Item[];
  writingTask1: PromptItem[];
  writingTask2: PromptItem[];
  grammar: { slug: string; title: string }[];
  hasVocabulary: boolean;
  mock: { id: string; title: string } | null;
};

export const PLAN_DAYS = 7;
const MIN_DAY_BUDGET = 20;

const SPEAKING_MODES = [
  { mode: "part2", label: "Part 2 long turn", minutes: 5 },
  { mode: "part1", label: "Part 1 interview", minutes: 5 },
  { mode: "part3", label: "Part 3 discussion", minutes: 5 },
  { mode: "full", label: "full speaking test", minutes: 14 },
] as const;

const band = (n: number) => n.toFixed(1);

// ---------- which skill gets which day ----------
type Slot = SkillKey | "FOUNDATIONS";

/** How much of the week each area deserves, from how far it is below the target (or unassessed). */
export function slotWeights(a: Analysis): Record<Slot, number> {
  const fallbackTarget = a.target ?? 6.5;
  const weights = {} as Record<Slot, number>;
  for (const s of SKILL_KEYS) {
    const b = a.bands[s];
    weights[s] = b === null ? 1.5 : 1 + Math.max(0, (a.target ?? fallbackTarget) - b);
  }
  const weakFoundation = !!a.assessment && (a.assessment.grammar < 60 || a.assessment.vocabulary < 60 || a.assessment.weakAreas.length > 0);
  const lowLevel = a.level === "A1" || a.level === "A2";
  weights.FOUNDATIONS = weakFoundation || lowLevel ? 1 : 0;
  return weights;
}

/** Splits `days` between the areas in proportion to their weights (each skill gets at least one day when there's room). */
export function allocateDays(weights: Record<Slot, number>, days: number): Slot[] {
  const slots = (Object.keys(weights) as Slot[]).filter((s) => weights[s] > 0);
  const total = slots.reduce((sum, s) => sum + weights[s], 0);
  const counts = new Map<Slot, number>();
  const remainders: [Slot, number][] = [];
  let used = 0;
  for (const s of slots) {
    const exact = (weights[s] / total) * days;
    const base = Math.max(days >= slots.length ? 1 : 0, Math.floor(exact));
    counts.set(s, base);
    used += base;
    remainders.push([s, exact - Math.floor(exact)]);
  }
  remainders.sort((x, y) => y[1] - x[1]);
  // Hand out or take back days until the total matches.
  for (let i = 0; used < days; i = (i + 1) % remainders.length) {
    counts.set(remainders[i][0], counts.get(remainders[i][0])! + 1);
    used++;
  }
  const byWeightAsc = [...slots].sort((x, y) => weights[x] - weights[y]);
  while (used > days) {
    const victim = byWeightAsc.find((s) => counts.get(s)! > (days >= slots.length ? 1 : 0));
    if (!victim) break;
    counts.set(victim, counts.get(victim)! - 1);
    used--;
  }

  // Order the days so the same area doesn't repeat back to back.
  const order: Slot[] = [];
  let previous: Slot | null = null;
  while (order.length < days) {
    const candidates = [...counts.entries()].filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1] || weights[y[0]] - weights[x[0]]);
    const pick = candidates.find(([s]) => s !== previous) ?? candidates[0];
    if (!pick) break;
    order.push(pick[0]);
    counts.set(pick[0], pick[1] - 1);
    previous = pick[0];
  }
  return order;
}

// ---------- choosing real content ----------
function pickItem<T extends { id: string; done: boolean; lastBand?: number | null }>(list: T[], used: Set<string>): T | null {
  if (list.length === 0) return null;
  const fresh = list.filter((i) => !used.has(i.id));
  const notDone = fresh.filter((i) => !i.done);
  if (notDone.length) return notDone[0];
  const pool = fresh.length ? fresh : list;
  // Everything has been done: repeat the one with the lowest band.
  return [...pool].sort((x, y) => (x.lastBand ?? 10) - (y.lastBand ?? 10))[0];
}

function reasonFor(slot: Slot, a: Analysis): string {
  if (slot === "FOUNDATIONS") {
    const bits: string[] = [];
    if (a.assessment && a.assessment.grammar < 60) bits.push(`grammar (${Math.round(a.assessment.grammar)}% in your placement test)`);
    if (a.assessment && a.assessment.vocabulary < 60) bits.push(`vocabulary (${Math.round(a.assessment.vocabulary)}%)`);
    return bits.length
      ? `Your placement test flagged ${bits.join(" and ")}. These skills support all four parts of the test.`
      : "Solid grammar and vocabulary support all four parts of the test.";
  }
  const label = SKILL_LABELS[slot];
  const parts: string[] = [];
  if (a.bands[slot] === null) {
    parts.push(`You haven't been assessed in ${label} yet, so this gives you a starting estimate.`);
  } else {
    const gap = bandGap(a, slot);
    parts.push(
      gap !== null && gap >= 0.5
        ? `Your estimated ${label} band is ${band(a.bands[slot]!)}, ${band(gap)} below your target of ${band(a.target!)}.`
        : `Your estimated ${label} band is ${band(a.bands[slot]!)}. Keep it sharp with regular practice.`
    );
  }
  if (slot === "listening" || slot === "reading") {
    const weak = a.weakQuestionTypes.find((w) => w.skill === slot);
    if (weak) parts.push(`Pay special attention to ${weak.label} questions (${weak.correct} of ${weak.total} right so far).`);
  }
  if (slot === "writing" && a.writing) {
    const c = a.writing.criteria;
    const entries = Object.entries(c) as [keyof typeof WRITING_CRITERIA, number][];
    const [key, value] = entries.reduce((l, e) => (e[1] < l[1] ? e : l));
    const avg = entries.reduce((s, e) => s + e[1], 0) / entries.length;
    if (avg - value >= 0.25) parts.push(`Your lowest Writing criterion is ${WRITING_CRITERIA[key].label}.`);
    if (a.writing.shortfall) parts.push(`Your last ${a.writing.shortfall.task === "TASK1" ? "Task 1" : "Task 2"} was under the ${a.writing.shortfall.min}-word minimum.`);
  }
  if (slot === "speaking" && a.speaking) {
    const entries = Object.entries(a.speaking.criteria) as [keyof typeof SPEAKING_CRITERIA, number][];
    const [key, value] = entries.reduce((l, e) => (e[1] < l[1] ? e : l));
    const avg = entries.reduce((s, e) => s + e[1], 0) / entries.length;
    if (avg - value >= 0.25) parts.push(`Your lowest Speaking criterion is ${SPEAKING_CRITERIA[key].label}.`);
  }
  return parts.join(" ");
}

// ---------- the plan ----------
export function buildPlan(a: Analysis, catalog: Catalog, today: Date = new Date()): PlanDay[] {
  const budget = Math.max(MIN_DAY_BUDGET, a.dailyGoalMinutes);

  // Day 7 becomes a mock test checkpoint when the exam is near, or once all four skills have been tried.
  const triedAll = SKILL_KEYS.every((s) => a.attempts[s] > 0);
  const examNear = a.daysToExam !== null && a.daysToExam >= 0 && a.daysToExam <= 30;
  const checkpoint = !!catalog.mock && (examNear || (triedAll && a.mocks.count === 0));
  const studyDays = checkpoint ? PLAN_DAYS - 1 : PLAN_DAYS;

  const order = allocateDays(slotWeights(a), studyDays);

  const used = { listening: new Set<string>(), reading: new Set<string>(), t1: new Set<string>(), t2: new Set<string>(), grammar: new Set<string>() };
  let speakingIndex = 0;
  let writingIndex = 0;
  const days: PlanDay[] = [];

  const newTask = (day: number, index: number, t: Omit<PlanTask, "id" | "completed">): PlanTask => ({ id: `d${day}t${index + 1}`, completed: false, ...t });

  order.forEach((slot, i) => {
    const day = i + 1;
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const raw: Omit<PlanTask, "id" | "completed">[] = [];
    let focus = "";

    if (slot === "listening") {
      focus = "Listening practice";
      const t = pickItem(catalog.listening, used.listening);
      if (t) {
        used.listening.add(t.id);
        raw.push({ type: "LISTENING", refId: t.id, title: `Listening: ${t.title}`, url: `${SKILL_URLS.listening}/${t.id}`, durationMinutes: t.minutes });
      }
    } else if (slot === "reading") {
      focus = "Reading practice";
      const t = pickItem(catalog.reading, used.reading);
      if (t) {
        used.reading.add(t.id);
        raw.push({ type: "READING", refId: t.id, title: `Reading: ${t.title}`, url: `${SKILL_URLS.reading}/${t.id}`, durationMinutes: t.minutes });
      }
    } else if (slot === "writing") {
      focus = "Writing practice";
      // Task 2 carries twice the weight of Task 1, but needs 40 minutes: on a short daily goal start with Task 1.
      const task2First = budget >= 40 ? writingIndex % 2 === 0 : writingIndex % 2 === 1;
      writingIndex++;
      const [primary, alt] = task2First ? ([catalog.writingTask2, catalog.writingTask1] as const) : ([catalog.writingTask1, catalog.writingTask2] as const);
      const isTask2 = (list: PromptItem[]) => list === catalog.writingTask2;
      for (const list of [primary, alt]) {
        const t = pickItem(list, isTask2(list) ? used.t2 : used.t1);
        if (!t) continue;
        (isTask2(list) ? used.t2 : used.t1).add(t.id);
        raw.push({
          type: "WRITING",
          refId: t.id,
          title: `Writing ${isTask2(list) ? "Task 2" : "Task 1"}: ${t.title}`,
          url: `${SKILL_URLS.writing}/${t.id}`,
          durationMinutes: isTask2(list) ? 40 : 20,
        });
        break;
      }
    } else if (slot === "speaking") {
      focus = "Speaking practice";
      const m = SPEAKING_MODES[speakingIndex % SPEAKING_MODES.length];
      speakingIndex++;
      const chosen = m.mode === "full" && budget < 15 ? SPEAKING_MODES[0] : m;
      raw.push({ type: "SPEAKING", refId: null, title: `Speaking: ${chosen.label}`, url: `${SKILL_URLS.speaking}/${chosen.mode}`, durationMinutes: chosen.minutes });
    } else {
      focus = "Grammar and vocabulary";
      const topic = catalog.grammar.filter((g) => !used.grammar.has(g.slug))[0] ?? catalog.grammar[0];
      if (topic) {
        used.grammar.add(topic.slug);
        raw.push({ type: "GRAMMAR", refId: topic.slug, title: `Grammar: ${topic.title}`, url: `/dashboard/grammar/${topic.slug}`, durationMinutes: 15 });
      }
      if (catalog.hasVocabulary) raw.push({ type: "VOCABULARY", refId: null, title: "Learn and review vocabulary flashcards", url: "/dashboard/flashcards", durationMinutes: 10 });
      raw.push({ type: "TUTOR", refId: null, title: "Practise with the AI Tutor: ask it to correct a few of your sentences", url: "/dashboard/tutor", durationMinutes: 10 });
    }

    // A small vocabulary habit on skill days, if it fits the daily goal.
    const total = raw.reduce((s, t) => s + t.durationMinutes, 0);
    if (slot !== "FOUNDATIONS" && catalog.hasVocabulary && total + 5 <= budget) {
      raw.push({ type: "VOCABULARY", refId: null, title: "Review 5 vocabulary flashcards", url: "/dashboard/flashcards", durationMinutes: 5 });
    }
    // Never leave a day empty (e.g. no published listening test).
    if (raw.length === 0) raw.push({ type: "TUTOR", refId: null, title: "Practise with the AI Tutor", url: "/dashboard/tutor", durationMinutes: 15 });

    days.push({
      day,
      date: iso,
      focusSkill: slot === "FOUNDATIONS" ? "FOUNDATIONS" : slot,
      focus,
      reason: reasonFor(slot, a),
      tasks: raw.map((t, idx) => newTask(day, idx, t)),
    });
  });

  if (checkpoint && catalog.mock) {
    const day = days.length + 1;
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days.length);
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    days.push({
      day,
      date: iso,
      focusSkill: "CHECKPOINT",
      focus: "Mock test checkpoint",
      reason: examNear
        ? `Your exam is ${a.daysToExam} day${a.daysToExam === 1 ? "" : "s"} away, so finish the week with a full timed test.`
        : "You've practised all four skills, so finish the week with a full timed test and see your estimated overall band.",
      tasks: [
        newTask(day, 0, { type: "MOCK", refId: catalog.mock.id, title: `Full mock test: ${catalog.mock.title} (about 2 hours)`, url: "/dashboard/ielts/mock-test", durationMinutes: 120 }),
      ],
    });
  }

  return days;
}

export function planProgress(days: PlanDay[]) {
  const tasks = days.flatMap((d) => d.tasks);
  const done = tasks.filter((t) => t.completed).length;
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

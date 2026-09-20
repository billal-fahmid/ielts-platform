/**
 * Turns a student's practice history into a short list of prioritised suggestions.
 * Pure functions only (no database, no AI) so the rules can be tested and explained: every
 * suggestion says what it is based on. Bands mentioned here are estimates, never official scores.
 */

export type SkillKey = "listening" | "reading" | "writing" | "speaking";
export type RecCategory = "GRAMMAR" | "VOCABULARY" | "READING" | "LISTENING" | "WRITING" | "SPEAKING";

export type Analysis = {
  target: number | null;
  level: string | null;
  bands: Record<SkillKey, number | null>;
  /** Completed attempts (Listening/Reading) and evaluated pieces of work (Writing/Speaking). */
  attempts: Record<SkillKey, number>;
  /** Question types the student answered correctly less than 60% of the time (at least 3 answered). */
  weakQuestionTypes: { skill: "listening" | "reading"; type: string; label: string; correct: number; total: number }[];
  writing: {
    count: number;
    /** Average of the most recent evaluations. */
    criteria: { task: number; coherence: number; lexical: number; grammar: number };
    /** The latest submission was shorter than the task minimum. */
    shortfall: { task: "TASK1" | "TASK2"; words: number; min: number } | null;
  } | null;
  speaking: {
    count: number;
    criteria: { fluency: number; lexical: number; grammar: number; pronunciation: number };
  } | null;
  assessment: { grammar: number; vocabulary: number; weakAreas: string[] } | null;
  vocab: { learned: number; difficult: number };
  mocks: { count: number; daysSinceLast: number | null };
  daysToExam: number | null;
  daysSinceStudy: number | null;
  dailyGoalMinutes: number;
};

export type Recommendation = {
  /** Stable key for the rule that produced it, so dismissals survive a refresh. */
  source: string;
  category: RecCategory;
  title: string;
  description: string;
  actionUrl: string;
  priority: number;
};

export const SKILL_LABELS: Record<SkillKey, string> = { listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" };
export const SKILL_URLS: Record<SkillKey, string> = {
  listening: "/dashboard/ielts/listening",
  reading: "/dashboard/ielts/reading",
  writing: "/dashboard/ielts/writing",
  speaking: "/dashboard/ielts/speaking",
};
const CATEGORY: Record<SkillKey, RecCategory> = { listening: "LISTENING", reading: "READING", writing: "WRITING", speaking: "SPEAKING" };
export const SKILL_KEYS: SkillKey[] = ["listening", "reading", "writing", "speaking"];

export const WRITING_CRITERIA = {
  task: { label: "Task Response / Achievement", tip: "Answer every part of the question and back each point up with a reason or example. In Task 1, include a clear overview of the main trends." },
  coherence: { label: "Coherence and Cohesion", tip: "Plan your paragraphs before you write. Give each one a clear topic sentence, and use linking words accurately rather than often." },
  lexical: { label: "Lexical Resource", tip: "Replace repeated words with precise alternatives, and learn common word partnerships (collocations) for popular IELTS topics." },
  grammar: { label: "Grammatical Range and Accuracy", tip: "Mix simple and complex sentences, and check tenses, articles and subject-verb agreement before you submit." },
} as const;

export const SPEAKING_CRITERIA = {
  fluency: { label: "Fluency and Coherence", tip: "Keep going when you hesitate. Extend each answer with a reason and an example instead of stopping after one sentence." },
  lexical: { label: "Lexical Resource", tip: "Use a wider range of words for common topics, and avoid repeating the same adjectives." },
  grammar: { label: "Grammatical Range and Accuracy", tip: "Try a few longer sentences with 'because', 'although' or 'if', and re-read your typed or spoken answers for tense slips." },
  pronunciation: { label: "Pronunciation (estimate)", tip: "This is a cautious estimate from the transcript only. Practise speaking clearly at a steady pace, and ask a teacher to check real pronunciation." },
} as const;

const round1 = (n: number) => Math.round(n * 10) / 10;
const band = (n: number) => n.toFixed(1);

function weakest<K extends string>(criteria: Record<K, number>, order: K[]) {
  const values = order.map((k) => criteria[k]);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const key = order.reduce((lowest, k) => (criteria[k] < criteria[lowest] ? k : lowest), order[0]);
  return { key, value: criteria[key], avg, spread: avg - criteria[key] };
}

/** Gap between the target and the estimate for one skill (positive means below target). */
export function bandGap(analysis: Analysis, skill: SkillKey): number | null {
  const b = analysis.bands[skill];
  return b === null || analysis.target === null ? null : round1(analysis.target - b);
}

export function buildRecommendations(a: Analysis): Recommendation[] {
  const recs: Recommendation[] = [];
  const add = (r: Recommendation) => recs.push(r);

  // 1. Nothing to go on yet: take a first practice in each skill.
  for (const skill of SKILL_KEYS) {
    if (a.attempts[skill] === 0) {
      add({
        source: `first:${skill}`,
        category: CATEGORY[skill],
        title: `Try your first ${SKILL_LABELS[skill]} practice`,
        description: `You haven't practised ${SKILL_LABELS[skill]} yet. One attempt gives you a starting band estimate, and we use it to plan the rest of your preparation.`,
        actionUrl: SKILL_URLS[skill],
        priority: 70,
      });
    }
  }

  // 2. Skills that are furthest below the target.
  for (const skill of SKILL_KEYS) {
    const gap = bandGap(a, skill);
    if (gap !== null && gap >= 0.5) {
      add({
        source: `gap:${skill}`,
        category: CATEGORY[skill],
        title: `Raise your ${SKILL_LABELS[skill]} band`,
        description: `Your estimated ${SKILL_LABELS[skill]} band is ${band(a.bands[skill]!)}, which is ${band(gap)} below your target of ${band(a.target!)}. Regular practice here will move your overall estimate the most.`,
        actionUrl: SKILL_URLS[skill],
        priority: Math.min(90, 50 + gap * 10),
      });
    }
  }

  // 3. Question types the student keeps getting wrong.
  [...a.weakQuestionTypes]
    .sort((x, y) => x.correct / x.total - y.correct / y.total)
    .slice(0, 2)
    .forEach((w) => {
      add({
        source: `qtype:${w.skill}:${w.type}`,
        category: CATEGORY[w.skill],
        title: `Practise ${w.label} questions`,
        description: `In ${SKILL_LABELS[w.skill]} you got ${w.correct} of ${w.total} ${w.label} questions right. Review the explanations after each attempt to see what these questions are really testing.`,
        actionUrl: SKILL_URLS[w.skill],
        priority: 60 + Math.round((1 - w.correct / w.total) * 20),
      });
    });

  // 4. Writing: word count and the weakest criterion.
  if (a.writing?.shortfall) {
    const s = a.writing.shortfall;
    add({
      source: "writing:short",
      category: "WRITING",
      title: `Write at least ${s.min} words in ${s.task === "TASK1" ? "Task 1" : "Task 2"}`,
      description: `Your latest ${s.task === "TASK1" ? "Task 1" : "Task 2"} had ${s.words} words. Under-length answers lose marks, so aim for the minimum of ${s.min} words and use the word counter while you write.`,
      actionUrl: SKILL_URLS.writing,
      priority: 68,
    });
  }
  if (a.writing) {
    const w = weakest(a.writing.criteria, ["task", "coherence", "lexical", "grammar"]);
    if (w.spread >= 0.25) {
      const c = WRITING_CRITERIA[w.key];
      add({
        source: `writing:${w.key}`,
        category: "WRITING",
        title: `Writing: strengthen ${c.label}`,
        description: `This is your lowest Writing criterion (AI estimate ${band(w.value)}, against an average of ${band(w.avg)}). ${c.tip}`,
        actionUrl: SKILL_URLS.writing,
        priority: 65,
      });
    }
  }

  // 5. Speaking: the weakest criterion.
  if (a.speaking) {
    const s = weakest(a.speaking.criteria, ["fluency", "lexical", "grammar", "pronunciation"]);
    if (s.spread >= 0.25) {
      const c = SPEAKING_CRITERIA[s.key];
      add({
        source: `speaking:${s.key}`,
        category: "SPEAKING",
        title: `Speaking: work on ${c.label}`,
        description: `This is your lowest Speaking criterion (AI estimate ${band(s.value)}, against an average of ${band(s.avg)}). ${c.tip}`,
        actionUrl: SKILL_URLS.speaking,
        priority: 64,
      });
    }
  }

  // 6. Grammar and vocabulary foundations.
  if (a.assessment && (a.assessment.weakAreas.includes("grammar") || a.assessment.grammar < 60)) {
    add({
      source: "foundation:grammar",
      category: "GRAMMAR",
      title: "Strengthen your grammar",
      description: `Your placement test showed grammar as a weak area (${Math.round(a.assessment.grammar)}%). Grammar underpins your Writing and Speaking bands, so a short daily lesson pays off.`,
      actionUrl: "/dashboard/grammar",
      priority: 55,
    });
  }
  if (a.assessment && (a.assessment.weakAreas.includes("vocabulary") || a.assessment.vocabulary < 60)) {
    add({
      source: "foundation:vocabulary",
      category: "VOCABULARY",
      title: "Build your vocabulary",
      description: `Your placement test showed vocabulary as a weak area (${Math.round(a.assessment.vocabulary)}%). Learn a few IELTS words a day with flashcards.`,
      actionUrl: "/dashboard/flashcards",
      priority: 54,
    });
  }
  if (a.vocab.difficult > 0) {
    add({
      source: "vocab:difficult",
      category: "VOCABULARY",
      title: "Review your difficult words",
      description: `You've marked ${a.vocab.difficult} word${a.vocab.difficult === 1 ? "" : "s"} as difficult. A five-minute flashcard review will help them stick.`,
      actionUrl: "/dashboard/flashcards",
      priority: 45,
    });
  } else if (a.vocab.learned < 20) {
    add({
      source: "vocab:start",
      category: "VOCABULARY",
      title: "Learn your first 20 IELTS words",
      description: `You've learned ${a.vocab.learned} word${a.vocab.learned === 1 ? "" : "s"} so far. Vocabulary shows up in every part of the test, so build it a little each day.`,
      actionUrl: "/dashboard/vocabulary",
      priority: 40,
    });
  }

  // 7. A full mock test, once all four skills have been tried.
  const triedAll = SKILL_KEYS.every((s) => a.attempts[s] > 0);
  if (triedAll && a.mocks.count === 0) {
    add({
      source: "mock:first",
      category: "READING",
      title: "Take a full mock test",
      description: "You've practised all four skills. A full timed mock test shows how you cope with the whole exam and gives an estimated overall band.",
      actionUrl: "/dashboard/ielts/mock-test",
      priority: 62,
    });
  } else if (a.mocks.count > 0 && a.mocks.daysSinceLast !== null && a.mocks.daysSinceLast >= 21 && (a.daysToExam === null || a.daysToExam <= 60)) {
    add({
      source: "mock:retake",
      category: "READING",
      title: "Time for another mock test",
      description: `It's been ${a.mocks.daysSinceLast} days since your last mock test. Take another to measure your progress.`,
      actionUrl: "/dashboard/ielts/mock-test",
      priority: 56,
    });
  }

  // 8. Exam close: point at the weakest skill.
  if (a.daysToExam !== null && a.daysToExam >= 0 && a.daysToExam <= 30) {
    const assessed = SKILL_KEYS.filter((s) => a.bands[s] !== null);
    if (assessed.length > 0) {
      const lowest = assessed.reduce((l, s) => (a.bands[s]! < a.bands[l]! ? s : l), assessed[0]);
      add({
        source: "exam:soon",
        category: CATEGORY[lowest],
        title: `${a.daysToExam} day${a.daysToExam === 1 ? "" : "s"} to go: focus on ${SKILL_LABELS[lowest]}`,
        description: `Your exam is close and ${SKILL_LABELS[lowest]} is your lowest estimated skill (${band(a.bands[lowest]!)}). Use your remaining time on timed practice.`,
        actionUrl: SKILL_URLS[lowest],
        priority: 58,
      });
    }
  }

  // 9. Gentle nudge after a break.
  if (a.daysSinceStudy !== null && a.daysSinceStudy >= 3) {
    add({
      source: "streak:restart",
      category: "VOCABULARY",
      title: "Get back on track with 10 minutes",
      description: `You haven't studied for ${a.daysSinceStudy} days. A short flashcard session today keeps your streak and your momentum going.`,
      actionUrl: "/dashboard/flashcards",
      priority: 35,
    });
  }

  return recs.sort((x, y) => y.priority - x.priority);
}

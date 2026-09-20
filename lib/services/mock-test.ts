import { db } from "@/lib/db";
import { mockTests, mockTestAttempts, ieltsAttempts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { MAX_ESSAY_CHARS, MIN_SUBMIT_WORDS, countWords } from "@/lib/ielts/writing";
import { WRITING_SECTION_SECONDS, combinedReadingBand, overallBand, writingBand } from "@/lib/ielts/mock-scoring";
import { getAttempt } from "@/lib/services/ielts-attempts";
import * as listening from "@/lib/services/listening";
import * as reading from "@/lib/services/reading";
import * as writing from "@/lib/services/writing";
import * as speaking from "@/lib/services/speaking";
import { awardXp, checkAndAwardBadges } from "@/lib/services/gamification";
import { listeningRunnerProps, readingRunnerProps } from "@/lib/services/runner-props";
import type { AIProvider } from "@/lib/ai/types";

export type MockTest = typeof mockTests.$inferSelect;
export type MockAttempt = typeof mockTestAttempts.$inferSelect;
export type Section = "LISTENING" | "READING" | "WRITING" | "SPEAKING";
export const SECTION_ORDER: Section[] = ["LISTENING", "READING", "WRITING", "SPEAKING"];
export const MOCK_COMPLETION_XP = 100;

// ---------- time ----------
/** Database timestamps are UTC, either "YYYY-MM-DD HH:MM:SS" (defaults) or ISO. */
export function parseDbTime(value: string): number {
  return new Date(/[TZ]/.test(value) ? value : value.replace(" ", "T") + "Z").getTime();
}
export function elapsedSeconds(startedAt: string | null | undefined): number {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((Date.now() - parseDbTime(startedAt)) / 1000));
}

// ---------- mock test definitions ----------
export function getMockTest(mockTestId: string) {
  return db.select().from(mockTests).where(eq(mockTests.id, mockTestId)).get();
}

/** Everything a mock test points at must exist and be live, or a student would hit a dead end mid-exam. */
export function mockTestProblems(mock: MockTest): string[] {
  const problems: string[] = [];

  const test = mock.listeningTestId ? listening.getTest(mock.listeningTestId) : undefined;
  if (!test) problems.push("The listening test no longer exists.");
  else if (!test.published) problems.push(`The listening test “${test.title}” isn't published.`);
  else if (listening.getQuestionsForTest(test.id).length === 0) problems.push(`The listening test “${test.title}” has no published questions.`);

  const passageIds = mock.readingPassageIds ?? [];
  if (passageIds.length === 0) problems.push("Choose at least one reading passage.");
  for (const id of passageIds) {
    const passage = reading.getPassage(id);
    if (!passage) problems.push("A reading passage no longer exists.");
    else if (!passage.published) problems.push(`The reading passage “${passage.title}” isn't published.`);
    else if (reading.getQuestionsForPassage(id).length === 0) problems.push(`The reading passage “${passage.title}” has no published questions.`);
  }

  for (const [id, expected, label] of [
    [mock.writingTask1PromptId, "TASK1", "Task 1"],
    [mock.writingTask2PromptId, "TASK2", "Task 2"],
  ] as const) {
    const prompt = id ? writing.getPrompt(id) : undefined;
    if (!prompt) problems.push(`Choose a Writing ${label} prompt.`);
    else if (prompt.taskType !== expected) problems.push(`The ${label} prompt must be a ${label} question.`);
    else if (!prompt.published) problems.push(`The Writing ${label} prompt isn't published.`);
  }

  if (speaking.pickContent("FULL_TEST").part1.length === 0) problems.push("There are no published Speaking questions.");
  return problems;
}

export function listPublishedMockTests() {
  return db
    .select()
    .from(mockTests)
    .where(eq(mockTests.published, true))
    .all()
    .filter((m) => mockTestProblems(m).length === 0);
}

// ---------- attempts ----------
export function getMockAttempt(attemptId: string) {
  return db.select().from(mockTestAttempts).where(eq(mockTestAttempts.id, attemptId)).get();
}

export function listUserMockAttempts(userId: string) {
  return db
    .select()
    .from(mockTestAttempts)
    .where(eq(mockTestAttempts.userId, userId))
    .all()
    .sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
}

export function startOrResumeMockAttempt(userId: string, mockTestId: string): MockAttempt {
  const existing = listUserMockAttempts(userId).find((a) => a.mockTestId === mockTestId && a.status === "IN_PROGRESS");
  if (existing) return existing;

  const mock = getMockTest(mockTestId);
  if (!mock || !mock.published || mockTestProblems(mock).length > 0) throw new Error("This mock test isn't available.");

  const attemptId = newId();
  db.insert(mockTestAttempts).values({ id: attemptId, userId, mockTestId, status: "IN_PROGRESS", currentSection: "LISTENING" }).run();
  return getMockAttempt(attemptId)!;
}

function update(attemptId: string, values: Partial<typeof mockTestAttempts.$inferInsert>) {
  db.update(mockTestAttempts).set(values).where(eq(mockTestAttempts.id, attemptId)).run();
}

/** Starts the clock for the current section (creating its attempt or drafts). Safe to call twice. */
export function beginSection(attemptId: string): MockAttempt | undefined {
  const a = getMockAttempt(attemptId);
  const mock = a && getMockTest(a.mockTestId);
  if (!a || !mock || a.status !== "IN_PROGRESS") return a;

  switch (a.currentSection) {
    case "LISTENING": {
      if (!a.listeningAttemptId) {
        const att = listening.startOrResumeAttempt(a.userId, mock.listeningTestId!, a.id);
        update(a.id, { listeningAttemptId: att.id });
      }
      break;
    }
    case "READING": {
      const ids = a.readingAttemptIds ?? [];
      const passageIds = mock.readingPassageIds ?? [];
      const last = ids.length ? getAttempt(ids[ids.length - 1]) : null;
      const needsNext = (!last || last.status === "COMPLETED") && ids.length < passageIds.length;
      if (needsNext) {
        const att = reading.startOrResumeAttempt(a.userId, passageIds[ids.length], a.id);
        update(a.id, { readingAttemptIds: [...ids, att.id] });
      }
      break;
    }
    case "WRITING": {
      if (!a.writingStartedAt) {
        const t1 = writing.startOrResumeDraft(a.userId, mock.writingTask1PromptId!, a.id);
        const t2 = writing.startOrResumeDraft(a.userId, mock.writingTask2PromptId!, a.id);
        update(a.id, { writingSubmissionIds: [t1.id, t2.id], writingStartedAt: new Date().toISOString() });
      }
      break;
    }
    default:
      break;
  }
  return getMockAttempt(attemptId);
}

// ---------- progress: expiry, auto-submit and advancing ----------
type SyncInput = { writing?: { task1: string; task2: string }; speakingSessionId?: string };

/** Seconds of slack after a deadline for a submit that was already in flight (slow network, clock drift). */
export const LATE_GRACE_SECONDS = 30;

/**
 * True when an attempt that belongs to a mock test is being submitted well after its deadline. The
 * submit routes then ignore the request body and grade the answers that were auto-saved in time.
 */
export function isLateMockSubmission(attempt: typeof ieltsAttempts.$inferSelect): boolean {
  if (!attempt.mockAttemptId) return false;
  const limit =
    attempt.skill === "LISTENING"
      ? listening.getTest(attempt.listeningTestId!)?.timeLimitSeconds
      : reading.getPassage(attempt.readingPassageId!)?.timeLimitSeconds;
  return !!limit && elapsedSeconds(attempt.startedAt) > limit + LATE_GRACE_SECONDS;
}

function submitWritingDrafts(a: MockAttempt, contents?: { task1: string; task2: string }) {
  const ids = a.writingSubmissionIds ?? [];
  const limit = WRITING_SECTION_SECONDS;
  if (elapsedSeconds(a.writingStartedAt) > limit + LATE_GRACE_SECONDS) contents = undefined; // too late: use what was auto-saved
  ids.forEach((id, i) => {
    const sub = writing.getSubmission(id);
    if (!sub || sub.status !== "DRAFT") return;
    const provided = i === 0 ? contents?.task1 : contents?.task2;
    const text = (typeof provided === "string" ? provided : sub.content).slice(0, MAX_ESSAY_CHARS);
    writing.markSubmitted(id, text, Math.min(limit, elapsedSeconds(a.writingStartedAt)));
  });
}

/** One step of progress for the current section. Returns true if anything changed. */
function stepOnce(a: MockAttempt, mock: MockTest, input: SyncInput): boolean {
  switch (a.currentSection) {
    case "LISTENING": {
      if (!a.listeningAttemptId) return false;
      const att = getAttempt(a.listeningAttemptId);
      if (!att) return false;
      const limit = listening.getTest(mock.listeningTestId!)!.timeLimitSeconds;
      if (att.status === "IN_PROGRESS") {
        if (elapsedSeconds(att.startedAt) < limit) return false;
        listening.submitAttempt(att.id, (att.answers as Record<string, unknown>) ?? {}, limit); // time's up: auto-submit
      }
      const done = getAttempt(att.id)!;
      update(a.id, { listeningBand: done.bandScore, currentSection: "READING" });
      return true;
    }

    case "READING": {
      const ids = a.readingAttemptIds ?? [];
      if (ids.length === 0) return false;
      const last = getAttempt(ids[ids.length - 1]);
      if (!last) return false;
      if (last.status === "IN_PROGRESS") {
        const limit = reading.getPassage(last.readingPassageId!)!.timeLimitSeconds;
        if (elapsedSeconds(last.startedAt) < limit) return false;
        reading.submitAttempt(last.id, (last.answers as Record<string, unknown>) ?? {}, limit);
        return true;
      }
      if (ids.length < (mock.readingPassageIds ?? []).length) return false; // waiting for the next passage to be started
      const attempts = ids.map((id) => getAttempt(id)!).filter(Boolean);
      const combined = combinedReadingBand(attempts, reading.getPassage(attempts[0].readingPassageId!)!.testType);
      update(a.id, { readingBand: combined?.band ?? 0, currentSection: "WRITING" });
      return true;
    }

    case "WRITING": {
      if (!a.writingStartedAt) return false;
      if (input.writing) submitWritingDrafts(a, input.writing);
      else if (elapsedSeconds(a.writingStartedAt) >= WRITING_SECTION_SECONDS) submitWritingDrafts(a);
      const submitted = (a.writingSubmissionIds ?? []).every((id) => writing.getSubmission(id)?.status !== "DRAFT");
      if (!submitted) return false;
      update(a.id, { currentSection: "SPEAKING" });
      return true;
    }

    case "SPEAKING": {
      const sid = input.speakingSessionId;
      if (!sid) return false;
      const session = speaking.getSession(sid);
      if (!session || session.userId !== a.userId || session.status !== "COMPLETED") return false;
      update(a.id, { speakingSessionId: sid, currentSection: "DONE", status: "COMPLETED", completedAt: new Date().toISOString() });
      return true;
    }

    default:
      return false;
  }
}

/**
 * Brings an attempt up to date: auto-submits any section whose time has run out (even if the
 * student closed the tab), and moves on from finished sections. Called on every page load and
 * whenever the student finishes a section.
 */
export function syncMockAttempt(attemptId: string, input: SyncInput = {}): MockAttempt | undefined {
  let pending = input;
  for (let guard = 0; guard < 10; guard++) {
    const a = getMockAttempt(attemptId);
    const mock = a && getMockTest(a.mockTestId);
    if (!a || !mock || a.status !== "IN_PROGRESS") break;
    if (!stepOnce(a, mock, pending)) break;
    pending = {};
  }
  return getMockAttempt(attemptId);
}

// ---------- what the runner should show ----------
export type Stage =
  | { section: "LISTENING"; phase: "ready"; info: { title: string; minutes: number; sections: number; questions: number } }
  | { section: "LISTENING"; phase: "active"; props: ReturnType<typeof listeningRunnerProps> }
  | { section: "READING"; phase: "ready"; info: { title: string; minutes: number; index: number; count: number; questions: number } }
  | { section: "READING"; phase: "active"; index: number; count: number; props: ReturnType<typeof readingRunnerProps> }
  | { section: "WRITING"; phase: "ready"; info: { minutes: number } }
  | {
      section: "WRITING";
      phase: "active";
      remainingSeconds: number;
      tasks: {
        submissionId: string;
        taskType: "TASK1" | "TASK2";
        category: string;
        promptText: string;
        imageUrl: string | null;
        visualDescription: string | null;
        content: string;
      }[];
    }
  | { section: "SPEAKING"; phase: "active" }
  | { section: "DONE" };

export function getStage(a: MockAttempt): Stage {
  const mock = getMockTest(a.mockTestId)!;

  switch (a.currentSection) {
    case "LISTENING": {
      const test = listening.getTest(mock.listeningTestId!)!;
      if (!a.listeningAttemptId) {
        return {
          section: "LISTENING",
          phase: "ready",
          info: {
            title: test.title,
            minutes: Math.round(test.timeLimitSeconds / 60),
            sections: listening.getSections(test.id).length,
            questions: listening.getQuestionsForTest(test.id).length,
          },
        };
      }
      const att = getAttempt(a.listeningAttemptId)!;
      return { section: "LISTENING", phase: "active", props: listeningRunnerProps(att, Math.min(test.timeLimitSeconds, elapsedSeconds(att.startedAt))) };
    }

    case "READING": {
      const ids = a.readingAttemptIds ?? [];
      const passageIds = mock.readingPassageIds ?? [];
      const last = ids.length ? getAttempt(ids[ids.length - 1]) : null;
      if (!last || last.status === "COMPLETED") {
        const passage = reading.getPassage(passageIds[ids.length])!;
        return {
          section: "READING",
          phase: "ready",
          info: {
            title: passage.title,
            minutes: Math.round(passage.timeLimitSeconds / 60),
            index: ids.length + 1,
            count: passageIds.length,
            questions: reading.getQuestionsForPassage(passage.id).length,
          },
        };
      }
      const limit = reading.getPassage(last.readingPassageId!)!.timeLimitSeconds;
      return {
        section: "READING",
        phase: "active",
        index: ids.length,
        count: passageIds.length,
        props: readingRunnerProps(last, Math.min(limit, elapsedSeconds(last.startedAt))),
      };
    }

    case "WRITING": {
      if (!a.writingStartedAt) return { section: "WRITING", phase: "ready", info: { minutes: Math.round(WRITING_SECTION_SECONDS / 60) } };
      const tasks = (a.writingSubmissionIds ?? []).map((id) => {
        const sub = writing.getSubmission(id)!;
        const prompt = sub.promptId ? writing.getPrompt(sub.promptId) : undefined;
        return {
          submissionId: sub.id,
          taskType: sub.taskType,
          category: prompt?.category ?? "",
          promptText: sub.promptTextSnapshot,
          imageUrl: prompt?.imageUrl ?? null,
          visualDescription: prompt?.visualDescription ?? null,
          content: sub.content,
        };
      });
      return {
        section: "WRITING",
        phase: "active",
        remainingSeconds: Math.max(0, WRITING_SECTION_SECONDS - elapsedSeconds(a.writingStartedAt)),
        tasks,
      };
    }

    case "SPEAKING":
      return { section: "SPEAKING", phase: "active" };

    default:
      return { section: "DONE" };
  }
}

// ---------- marking and results ----------
const WRITING_TOO_SHORT = (words: number) => words < MIN_SUBMIT_WORDS;

function speakingHasAnswers(sessionId: string) {
  return speaking.getTurns(sessionId).some((t) => t.transcript.trim().length > 0);
}

/**
 * Marks everything that needs the AI (both essays and the speaking session, in parallel), then works
 * out the section bands and the overall band. Safe to call again: it only does the missing work.
 */
export async function finalizeMockAttempt(attemptId: string, provider?: AIProvider): Promise<{ complete: boolean; pending: string[] }> {
  const a = getMockAttempt(attemptId);
  if (!a || a.currentSection !== "DONE") return { complete: false, pending: ["The test isn't finished yet."] };

  const essayIds = a.writingSubmissionIds ?? [];
  const jobs: Promise<unknown>[] = [];
  for (const id of essayIds) {
    const sub = writing.getSubmission(id);
    if (sub && !WRITING_TOO_SHORT(countWords(sub.content)) && !writing.getEvaluation(id)) jobs.push(writing.evaluateSubmission(id, provider));
  }
  if (a.speakingSessionId && speakingHasAnswers(a.speakingSessionId) && !speaking.getEvaluation(a.speakingSessionId)) {
    jobs.push(speaking.evaluateSession(a.speakingSessionId, provider));
  }
  await Promise.all(jobs);

  const taskBands = essayIds.map((id) => {
    const sub = writing.getSubmission(id);
    if (!sub) return null;
    if (WRITING_TOO_SHORT(countWords(sub.content))) return 0;
    return writing.getEvaluation(id)?.estimatedBand ?? null;
  });
  const writingResult = taskBands.length === 2 && taskBands.every((b) => b !== null) ? writingBand(taskBands[0]!, taskBands[1]!) : null;
  const speakingResult = a.speakingSessionId
    ? speakingHasAnswers(a.speakingSessionId)
      ? speaking.getEvaluation(a.speakingSessionId)?.estimatedBand ?? null
      : 0
    : null;

  const overall = overallBand({ listening: a.listeningBand, reading: a.readingBand, writing: writingResult, speaking: speakingResult });
  const firstTimeComplete = overall !== null && a.overallBand === null;
  update(a.id, { writingBand: writingResult, speakingBand: speakingResult, overallBand: overall });

  if (firstTimeComplete) {
    await awardXp(a.userId, MOCK_COMPLETION_XP);
    const completed = listUserMockAttempts(a.userId).filter((x) => x.overallBand !== null).length;
    await checkAndAwardBadges(a.userId, { mockTestsCompleted: completed });
  }

  const pending: string[] = [];
  if (writingResult === null) pending.push("Writing");
  if (speakingResult === null) pending.push("Speaking");
  return { complete: overall !== null, pending };
}

export function getMockSummary(attemptId: string) {
  const a = getMockAttempt(attemptId);
  if (!a) return null;
  const mock = getMockTest(a.mockTestId);

  const listeningAttempt = a.listeningAttemptId ? getAttempt(a.listeningAttemptId) : undefined;
  const readingAttempts = (a.readingAttemptIds ?? []).map((id) => getAttempt(id)).filter(Boolean) as (typeof ieltsAttempts.$inferSelect)[];
  const readingRaw = readingAttempts.reduce((s, x) => s + (x.rawScore ?? 0), 0);
  const readingTotal = readingAttempts.reduce((s, x) => s + (x.totalQuestions ?? 0), 0);

  const tasks = (a.writingSubmissionIds ?? []).map((id) => {
    const sub = writing.getSubmission(id);
    const evaluation = sub ? writing.getEvaluation(id) : undefined;
    const words = sub?.wordCount ?? 0;
    return {
      submissionId: id,
      taskType: sub?.taskType ?? "TASK1",
      words,
      tooShort: WRITING_TOO_SHORT(words),
      band: WRITING_TOO_SHORT(words) ? 0 : evaluation?.estimatedBand ?? null,
    };
  });

  return {
    attempt: a,
    mock,
    listening: { band: a.listeningBand, raw: listeningAttempt?.rawScore ?? null, total: listeningAttempt?.totalQuestions ?? null, attemptId: listeningAttempt?.id ?? null },
    reading: { band: a.readingBand, raw: readingRaw, total: readingTotal, attemptIds: readingAttempts.map((x) => x.id) },
    writing: { band: a.writingBand, tasks },
    speaking: { band: a.speakingBand, sessionId: a.speakingSessionId },
    overall: a.overallBand,
  };
}


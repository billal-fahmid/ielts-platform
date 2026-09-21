import { db } from "@/lib/db";
import {
  courses,
  modules,
  lessons,
  vocabulary,
  badges,
  grammarTopics,
  questions,
  quizzes,
  users,
  readingPassages,
  listeningTests,
  listeningSections,
  writingPrompts,
  speakingPrompts,
  ieltsQuestions,
  ieltsAttempts,
  mockTests,
  mockTestAttempts,
  plans,
  coupons,
  couponRedemptions,
  paymentAccounts,
  enrollments,
  progress,
  quizAttempts,
  batches,
  assignments,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { id as newId, slugify } from "@/lib/utils";
import { resourceMeta, type FieldConfig } from "@/lib/admin/field-config";
import { PLAN_FEATURES } from "@/lib/plans/features";
import { normalizeWalletNumber } from "@/lib/payments/validation";
import { normalizeCouponCode } from "@/lib/payments/pricing";
import { mockTestProblems } from "@/lib/services/mock-test";
import { TASK1_CATEGORIES, TASK2_CATEGORIES, countWords } from "@/lib/ielts/writing";

const tables: Record<string, any> = {
  courses,
  modules,
  lessons,
  vocabulary,
  grammarTopics,
  quizzes,
  questions,
  badges,
  users,
  readingPassages,
  listeningTests,
  listeningSections,
  writingPrompts,
  speakingPrompts,
  mockTests,
  plans,
  coupons,
  paymentAccounts,
};

const needsSlug = new Set(["courses", "modules", "lessons", "grammarTopics"]);

export const resources = resourceMeta;

/** A problem the admin can fix; its message is shown to them as-is. */
export class ResourceError extends Error {}

type Hooks = {
  /** Fills in computed fields before saving. */
  prepare?: (data: Record<string, any>) => void;
  /** Cross-field and publish rules; `merged` is the existing record with the changes applied. */
  validate?: (merged: Record<string, any>, ctx: { existing: any | null; changes: Record<string, any> }) => void;
  /** Blocks deleting records other content depends on. */
  beforeDelete?: (id: string) => void;
};

const isSafeUrl = (url: string) => /^\/(?!\/)/.test(url) || /^https?:\/\//i.test(url);
const count = (rows: unknown[]) => rows.length;

/** Stops deleting a record that a mock test is built from. */
function assertNotInMockTest(kind: string, id: string) {
  const used = db
    .select()
    .from(mockTests)
    .all()
    .find((m) => m.listeningTestId === id || (m.readingPassageIds ?? []).includes(id) || m.writingTask1PromptId === id || m.writingTask2PromptId === id);
  if (used) throw new ResourceError(`This ${kind} is part of the mock test “${used.title}”. Remove it from the mock test first.`);
}

const hooks: Record<string, Hooks> = {
  // Course content is a tree (course → modules → lessons → quiz → questions). Deleting a parent that still has children
  // would leave orphans, and deleting anything students have used would erase their progress.
  courses: {
    beforeDelete: (id) => {
      const moduleCount = count(db.select().from(modules).where(eq(modules.courseId, id)).all());
      if (moduleCount > 0) throw new ResourceError(`This course has ${moduleCount} module${moduleCount === 1 ? "" : "s"}. Delete them first.`);
      if (count(db.select().from(enrollments).where(eq(enrollments.courseId, id)).all()) > 0) {
        throw new ResourceError("Students are enrolled in this course, so it can't be deleted. Untick Published to hide it instead.");
      }
      const inUse = db.select().from(batches).where(eq(batches.courseId, id)).get() ?? db.select().from(assignments).where(eq(assignments.courseId, id)).get();
      if (inUse) throw new ResourceError("A batch or assignment uses this course. Remove those first, or untick Published to hide the course.");
    },
  },

  modules: {
    beforeDelete: (id) => {
      const lessonCount = count(db.select().from(lessons).where(eq(lessons.moduleId, id)).all());
      if (lessonCount > 0) throw new ResourceError(`This module has ${lessonCount} lesson${lessonCount === 1 ? "" : "s"}. Delete them first.`);
    },
  },

  lessons: {
    validate: (m) => {
      if (m.xpReward != null && (!Number.isInteger(m.xpReward) || m.xpReward < 0 || m.xpReward > 100)) {
        throw new ResourceError("XP reward must be a whole number from 0 to 100.");
      }
      if (m.videoUrl && !isSafeUrl(String(m.videoUrl))) throw new ResourceError("The video must be a path starting with “/” or a full http(s) URL.");
      if (m.audioUrl && !isSafeUrl(String(m.audioUrl))) throw new ResourceError("The audio must be a path starting with “/” or a full http(s) URL.");
    },
    beforeDelete: (id) => {
      if (db.select().from(quizzes).where(eq(quizzes.lessonId, id)).get()) throw new ResourceError("This lesson has a quiz. Delete the quiz first.");
      if (db.select().from(progress).where(eq(progress.lessonId, id)).get()) {
        throw new ResourceError("Students have already worked on this lesson, so it can't be deleted.");
      }
    },
  },

  quizzes: {
    validate: (m) => {
      if (m.type === "LESSON" && !m.lessonId) throw new ResourceError("A lesson quiz must belong to a lesson.");
    },
    beforeDelete: (id) => {
      const questionCount = count(db.select().from(questions).where(eq(questions.quizId, id)).all());
      if (questionCount > 0) throw new ResourceError(`This quiz has ${questionCount} question${questionCount === 1 ? "" : "s"}. Delete them first.`);
      if (db.select().from(quizAttempts).where(eq(quizAttempts.quizId, id)).get()) throw new ResourceError("Students have already taken this quiz, so it can't be deleted.");
    },
  },

  questions: {
    prepare: (data) => {
      // The quiz screen shows a true/false question from its options, so they always exist.
      if (data.type === "TRUE_FALSE") data.options = ["True", "False"];
    },
    validate: (m) => {
      const options: string[] = Array.isArray(m.options) ? m.options : [];
      if (m.type === "MCQ") {
        if (options.length < 2) throw new ResourceError("A multiple-choice question needs at least two options (one per line).");
        if (!options.includes(m.correctAnswer)) throw new ResourceError("The correct answer must match one of the options exactly.");
      }
      if (m.type === "TRUE_FALSE" && !["True", "False"].includes(m.correctAnswer)) throw new ResourceError("For true/false questions the correct answer must be True or False.");
    },
  },

  readingPassages: {
    prepare: (data) => {
      if (typeof data.bodyText === "string") data.wordCount = countWords(data.bodyText);
    },
    validate: (m, { existing, changes }) => {
      if (m.passageNumber != null && (m.passageNumber < 1 || m.passageNumber > 3 || !Number.isInteger(m.passageNumber))) {
        throw new ResourceError("Passage number must be 1, 2 or 3.");
      }
      if (m.timeLimitSeconds != null && (m.timeLimitSeconds < 60 || m.timeLimitSeconds > 7200)) {
        throw new ResourceError("The time limit must be between 60 and 7200 seconds.");
      }
      const publishing = changes.published === true && !existing?.published;
      if (publishing) {
        const published = existing
          ? count(db.select().from(ieltsQuestions).where(and(eq(ieltsQuestions.passageId, existing.id), eq(ieltsQuestions.published, true))).all())
          : 0;
        if (published === 0) throw new ResourceError("Add and publish at least one question before publishing this passage.");
      }
    },
    beforeDelete: (id) => {
      assertNotInMockTest("passage", id);
      const questionCount = count(db.select().from(ieltsQuestions).where(eq(ieltsQuestions.passageId, id)).all());
      if (questionCount > 0) throw new ResourceError(`This passage has ${questionCount} question${questionCount === 1 ? "" : "s"}. Delete them first.`);
      if (count(db.select().from(ieltsAttempts).where(eq(ieltsAttempts.readingPassageId, id)).all()) > 0) {
        throw new ResourceError("Students have already attempted this passage, so it can't be deleted. Unpublish it instead.");
      }
    },
  },

  listeningTests: {
    validate: (m, { existing, changes }) => {
      if (m.timeLimitSeconds != null && (m.timeLimitSeconds < 60 || m.timeLimitSeconds > 7200)) {
        throw new ResourceError("The time limit must be between 60 and 7200 seconds.");
      }
      const publishing = changes.published === true && !existing?.published;
      if (publishing) {
        const sections = existing ? db.select().from(listeningSections).where(eq(listeningSections.listeningTestId, existing.id)).all() : [];
        if (sections.length === 0) throw new ResourceError("Add at least one section before publishing this test.");
        const hasPublished = sections.some(
          (s) => db.select().from(ieltsQuestions).where(and(eq(ieltsQuestions.listeningSectionId, s.id), eq(ieltsQuestions.published, true))).all().length > 0
        );
        if (!hasPublished) throw new ResourceError("Add and publish at least one question in a section before publishing this test.");
      }
    },
    beforeDelete: (id) => {
      assertNotInMockTest("listening test", id);
      const sectionCount = count(db.select().from(listeningSections).where(eq(listeningSections.listeningTestId, id)).all());
      if (sectionCount > 0) throw new ResourceError(`This test has ${sectionCount} section${sectionCount === 1 ? "" : "s"}. Delete them first.`);
      if (count(db.select().from(ieltsAttempts).where(eq(ieltsAttempts.listeningTestId, id)).all()) > 0) {
        throw new ResourceError("Students have already attempted this test, so it can't be deleted. Unpublish it instead.");
      }
    },
  },

  listeningSections: {
    validate: (m, { existing }) => {
      if (!Number.isInteger(m.sectionNumber) || m.sectionNumber < 1 || m.sectionNumber > 4) {
        throw new ResourceError("Section number must be 1, 2, 3 or 4.");
      }
      if (!isSafeUrl(String(m.audioUrl ?? ""))) {
        throw new ResourceError("The audio must be a path starting with “/” or a full http(s) URL.");
      }
      const clash = db
        .select()
        .from(listeningSections)
        .where(eq(listeningSections.listeningTestId, m.listeningTestId))
        .all()
        .find((s) => s.sectionNumber === m.sectionNumber && s.id !== existing?.id);
      if (clash) throw new ResourceError(`This test already has a Section ${m.sectionNumber}.`);
    },
    beforeDelete: (id) => {
      const questionCount = count(db.select().from(ieltsQuestions).where(eq(ieltsQuestions.listeningSectionId, id)).all());
      if (questionCount > 0) throw new ResourceError(`This section has ${questionCount} question${questionCount === 1 ? "" : "s"}. Delete them first.`);
    },
  },

  writingPrompts: {
    beforeDelete: (id) => assertNotInMockTest("prompt", id),
    validate: (m) => {
      const allowed = m.taskType === "TASK1" ? TASK1_CATEGORIES : TASK2_CATEGORIES;
      if (!allowed.includes(m.category)) {
        throw new ResourceError(`“${m.category}” isn't a ${m.taskType === "TASK1" ? "Task 1" : "Task 2"} category.`);
      }
      if (m.imageUrl && !isSafeUrl(String(m.imageUrl))) throw new ResourceError("The image must be a path starting with “/” or a full http(s) URL.");
      if (m.taskType === "TASK1" && !String(m.visualDescription ?? "").trim()) {
        throw new ResourceError("Task 1 needs a text description of the visual, so the AI can assess the student's report.");
      }
    },
  },

  mockTests: {
    prepare: (data) => {
      // Passages always run in passage-number order, however they were ticked.
      if (Array.isArray(data.readingPassageIds)) {
        const order = new Map(db.select().from(readingPassages).all().map((p) => [p.id, p.passageNumber]));
        data.readingPassageIds = [...data.readingPassageIds].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
      }
    },
    validate: (m) => {
      const problems = mockTestProblems(m as any);
      // A draft may be incomplete; a published mock must be something a student can finish.
      if (m.published && problems.length > 0) throw new ResourceError(`This mock test can't be published yet. ${problems.join(" ")}`);
      // Wrong-kind prompts are wrong even in a draft.
      const wrong = problems.find((p) => p.includes("must be a"));
      if (wrong) throw new ResourceError(wrong);
    },
    beforeDelete: (id) => {
      if (count(db.select().from(mockTestAttempts).where(eq(mockTestAttempts.mockTestId, id)).all()) > 0) {
        throw new ResourceError("Students have already taken this mock test, so it can't be deleted. Unpublish it instead.");
      }
    },
  },

  plans: {
    validate: (m, { existing }) => {
      if (!existing) throw new ResourceError("Plans can't be created here.");
      if (!Number.isInteger(m.priceMonthly) || m.priceMonthly < 0 || m.priceMonthly > 1_000_000) throw new ResourceError("The monthly price must be a whole number of taka, 0 or more.");
      if (m.priceYearly !== null && m.priceYearly !== undefined && (!Number.isInteger(m.priceYearly) || m.priceYearly < 0 || m.priceYearly > 10_000_000)) {
        throw new ResourceError("The yearly price must be a whole number of taka, or empty.");
      }
      for (const key of ["vocabPerDay", "quizzesPerDay"]) {
        const v = m[key];
        if (v !== null && v !== undefined && (!Number.isInteger(v) || v < 1 || v > 10_000)) throw new ResourceError("Daily limits must be whole numbers of 1 or more, or empty for unlimited.");
      }
      if (!Number.isInteger(m.rank) || m.rank < 0 || m.rank > 10) throw new ResourceError("Rank must be a whole number from 0 to 10.");
      const unknown = (m.features as string[]).filter((f) => !(PLAN_FEATURES as readonly string[]).includes(f));
      if (unknown.length) throw new ResourceError(`Unknown feature: ${unknown[0]}.`);
      if (existing.code === "FREE") {
        if (m.priceMonthly !== 0 || (m.priceYearly ?? 0) !== 0) throw new ResourceError("The Free plan must stay free.");
        if (m.rank !== 0) throw new ResourceError("The Free plan must have rank 0.");
        if (!m.published) throw new ResourceError("The Free plan must stay published: it is what everyone starts on.");
      } else if (m.rank < 1) {
        throw new ResourceError("Paid plans need a rank of 1 or more.");
      }
      const clash = db.select().from(plans).all().find((p) => p.id !== existing.id && p.rank === m.rank);
      if (clash) throw new ResourceError(`${clash.name} already has rank ${m.rank}. Each plan needs its own rank.`);
    },
    beforeDelete: () => {
      throw new ResourceError("Plans can't be deleted. Unpublish a paid plan to stop selling it.");
    },
  },

  coupons: {
    prepare: (data) => {
      if (typeof data.code === "string") data.code = normalizeCouponCode(data.code);
    },
    validate: (m, { existing }) => {
      if (!/^[A-Z0-9_-]{3,30}$/.test(m.code)) throw new ResourceError("The code must be 3 to 30 letters, numbers, - or _ (no spaces).");
      if (!existing && db.select().from(coupons).where(eq(coupons.code, m.code)).get()) throw new ResourceError(`The code ${m.code} already exists.`);
      if (m.type === "PERCENT" && (!Number.isInteger(m.value) || m.value < 1 || m.value > 100)) throw new ResourceError("A percentage discount must be a whole number from 1 to 100.");
      if (m.type === "FIXED" && (!Number.isInteger(m.value) || m.value < 1 || m.value > 1_000_000)) throw new ResourceError("A fixed discount must be a whole number of taka, at least 1.");
      for (const [key, label] of [["maxDiscount", "Largest discount"], ["minAmount", "Smallest purchase"], ["usageLimit", "Total uses"]] as const) {
        const v = m[key];
        if (v !== null && v !== undefined && (!Number.isInteger(v) || v < 1 || v > 10_000_000)) throw new ResourceError(`${label} must be a whole number of 1 or more, or empty.`);
      }
      if (m.maxDiscount != null && m.type !== "PERCENT") throw new ResourceError("A largest discount only applies to percentage coupons.");
      if (!Number.isInteger(m.perUserLimit) || m.perUserLimit < 1 || m.perUserLimit > 100) throw new ResourceError("Uses per student must be a whole number from 1 to 100.");
      const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));
      for (const [key, label] of [["startsAt", "Starts on"], ["expiresAt", "Expires on"]] as const) {
        if (m[key] && !isDate(m[key])) throw new ResourceError(`${label} must be a date like 2026-12-31.`);
      }
      if (m.startsAt && m.expiresAt && m.expiresAt < m.startsAt) throw new ResourceError("The coupon can't expire before it starts.");
      for (const p of (m.planCodes as string[]) ?? []) if (!["BASIC", "PREMIUM", "PRO"].includes(p)) throw new ResourceError(`${p} isn't a paid plan.`);
    },
    beforeDelete: (id) => {
      if (count(db.select().from(couponRedemptions).where(eq(couponRedemptions.couponId, id)).all()) > 0) {
        throw new ResourceError("This coupon has been used, so it can't be deleted. Untick Active to stop it being used.");
      }
    },
  },

  paymentAccounts: {
    prepare: (data) => {
      if (typeof data.accountNumber === "string" && typeof data.method === "string" && data.method !== "BANK_TRANSFER") {
        data.accountNumber = normalizeWalletNumber(data.method as "BKASH", data.accountNumber) ?? data.accountNumber;
      }
    },
    validate: (m) => {
      if (m.method === "BANK_TRANSFER") {
        if (!/^[0-9A-Za-z\- ]{5,34}$/.test(m.accountNumber)) throw new ResourceError("Enter the bank account number (5 to 34 letters, numbers or dashes).");
        if (!String(m.bankName ?? "").trim()) throw new ResourceError("Bank transfers need the bank's name.");
      } else if (!normalizeWalletNumber(m.method, m.accountNumber)) {
        throw new ResourceError("bKash, Nagad and Rocket accounts need a Bangladeshi mobile number like 01712345678 (Rocket accounts may have one extra digit).");
      }
    },
  },

  speakingPrompts: {
    validate: (m) => {
      if (m.part !== "PART3" && String(m.followUpOfTopic ?? "").trim()) {
        throw new ResourceError("Only Part 3 questions can follow a Part 2 topic.");
      }
    },
  },
};

/**
 * Keeps only the fields the admin form declares, coerces them to their declared types and checks
 * required/enum/relation rules. Anything else in the request body is ignored.
 */
function sanitize(key: string, data: Record<string, any>, mode: "create" | "update") {
  const meta = resourceMeta[key];
  const out: Record<string, any> = {};

  for (const f of meta.fields as FieldConfig[]) {
    if (f.readOnly && mode === "update") continue; // fixed once created
    if (f.nullable && Object.prototype.hasOwnProperty.call(data, f.key) && (data[f.key] === null || data[f.key] === "")) {
      out[f.key] = null;
      continue;
    }
    const provided = Object.prototype.hasOwnProperty.call(data, f.key) && data[f.key] !== undefined && data[f.key] !== null;
    if (!provided) {
      if (mode === "create" && f.required && f.type !== "checkbox") throw new ResourceError(`${f.label} is required.`);
      continue;
    }
    const raw = data[f.key];

    switch (f.type) {
      case "text":
      case "textarea": {
        if (typeof raw !== "string") throw new ResourceError(`${f.label} must be text.`);
        const value = raw.trim();
        if (f.required && !value) throw new ResourceError(`${f.label} is required.`);
        if (value.length > 20000) throw new ResourceError(`${f.label} is too long.`);
        out[f.key] = value;
        break;
      }
      case "number": {
        const n = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(n)) throw new ResourceError(`${f.label} must be a number.`);
        out[f.key] = n;
        break;
      }
      case "checkbox":
        out[f.key] = raw === true || raw === "true";
        break;
      case "select": {
        const value = String(raw);
        if (value === "" && !f.required) out[f.key] = "";
        else if (!f.options?.includes(value)) throw new ResourceError(`${f.label} must be one of: ${f.options?.join(", ")}.`);
        else out[f.key] = value;
        break;
      }
      case "json-list": {
        if (!Array.isArray(raw)) throw new ResourceError(`${f.label} must be a list.`);
        out[f.key] = raw.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
        break;
      }
      case "multi-select": {
        if (!Array.isArray(raw)) throw new ResourceError(`${f.label} must be a list.`);
        const chosen = [...new Set(raw.filter((x): x is string => typeof x === "string"))];
        const bad = chosen.find((x) => !f.options?.includes(x));
        if (bad) throw new ResourceError(`"${bad}" is not a valid choice for ${f.label.toLowerCase()}.`);
        out[f.key] = chosen;
        break;
      }
      case "relation-multi": {
        const target = f.relation && tables[f.relation.resource];
        if (!Array.isArray(raw) || !target) throw new ResourceError(`${f.label} must be a list.`);
        const ids = [...new Set(raw.filter((x): x is string => typeof x === "string" && x !== ""))];
        if (f.required && ids.length === 0) throw new ResourceError(`Choose at least one for ${f.label.toLowerCase()}.`);
        for (const id of ids) {
          if (!db.select().from(target).where(eq(target.id, id)).get()) throw new ResourceError(`One of the selected ${f.label.toLowerCase()} no longer exists.`);
        }
        out[f.key] = ids;
        break;
      }
      case "relation": {
        const target = f.relation && tables[f.relation.resource];
        if (typeof raw !== "string" || !raw || !target) throw new ResourceError(`${f.label} is required.`);
        if (!db.select().from(target).where(eq(target.id, raw)).get()) throw new ResourceError(`The selected ${f.label.toLowerCase()} no longer exists.`);
        out[f.key] = raw;
        break;
      }
    }
  }
  return out;
}

/** A readable name for course-tree records in dropdowns: "Course › Module › Lesson". */
function treeLabels(key: string): ((row: any) => string) | null {
  if (key !== "modules" && key !== "lessons" && key !== "quizzes") return null;
  const courseTitle = new Map(db.select().from(courses).all().map((c) => [c.id, c.title]));
  const moduleRows = new Map(db.select().from(modules).all().map((m) => [m.id, m]));
  const moduleLabel = (m: any) => (m ? `${courseTitle.get(m.courseId) ?? "?"} › ${m.title}` : "?");
  const lessonRows = new Map(db.select().from(lessons).all().map((l) => [l.id, l]));
  const lessonLabel = (l: any) => (l ? `${moduleLabel(moduleRows.get(l.moduleId))} › ${l.title}` : "?");
  if (key === "modules") return moduleLabel;
  if (key === "lessons") return lessonLabel;
  return (q) => (q.lessonId ? `${q.title} (${lessonLabel(lessonRows.get(q.lessonId))})` : q.title);
}

export function listResource(key: string) {
  const table = tables[key];
  if (!table) return [];
  const label = treeLabels(key);
  // Never send password hashes (or similar) to the browser, even to administrators.
  return db.select().from(table).all().map(({ passwordHash, ...safe }: any) => (label ? { ...safe, _label: label(safe) } : safe));
}

function getExisting(key: string, id: string) {
  const table = tables[key];
  return db.select().from(table).where(eq(table.id, id)).get() ?? null;
}

export function createResource(key: string, data: Record<string, any>) {
  const table = tables[key];
  if (!table) throw new Error("Unknown resource");

  const changes = sanitize(key, data, "create");
  const hook = hooks[key];
  hook?.prepare?.(changes);
  hook?.validate?.(changes, { existing: null, changes });

  const payload: any = { id: newId(), ...changes };
  if (needsSlug.has(key) && payload.title) {
    payload.slug = slugify(payload.title) + "-" + Math.random().toString(36).slice(2, 6);
  }
  db.insert(table).values(payload).run();
  return payload;
}

export function updateResource(key: string, id: string, data: Record<string, any>) {
  const table = tables[key];
  if (!table) throw new Error("Unknown resource");
  const existing = getExisting(key, id);
  if (!existing) throw new ResourceError("That record no longer exists.");

  const changes = sanitize(key, data, "update");
  const hook = hooks[key];
  hook?.prepare?.(changes);
  hook?.validate?.({ ...existing, ...changes }, { existing, changes });

  if (Object.keys(changes).length === 0) return; // nothing editable was sent (for example only read-only fields)
  db.update(table).set(changes).where(eq(table.id, id)).run();
}

export function deleteResource(key: string, id: string) {
  const table = tables[key];
  if (!table) throw new Error("Unknown resource");
  hooks[key]?.beforeDelete?.(id);
  db.delete(table).where(eq(table.id, id)).run();
}

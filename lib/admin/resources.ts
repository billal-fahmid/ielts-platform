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
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { id as newId, slugify } from "@/lib/utils";
import { resourceMeta, type FieldConfig } from "@/lib/admin/field-config";
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

export function listResource(key: string) {
  const table = tables[key];
  if (!table) return [];
  return db.select().from(table).all();
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

  db.update(table).set(changes).where(eq(table.id, id)).run();
}

export function deleteResource(key: string, id: string) {
  const table = tables[key];
  if (!table) throw new Error("Unknown resource");
  hooks[key]?.beforeDelete?.(id);
  db.delete(table).where(eq(table.id, id)).run();
}

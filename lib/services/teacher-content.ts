import { db } from "@/lib/db";
import { courses, lessons, modules, questions, quizzes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TEACHER_OWNED_RESOURCES } from "@/lib/admin/access";
import { resourceMeta } from "@/lib/admin/field-config";
import { createResource, deleteResource, listResource, ResourceError, updateResource } from "@/lib/admin/resources";

/**
 * Content a teacher owns. A teacher only ever sees and changes what belongs to their own courses:
 * course → modules → lessons → lesson quizzes → quiz questions.
 */
export const OWNED_RESOURCES = TEACHER_OWNED_RESOURCES;

/** Shared question-bank content that any teacher may add to (it belongs to the platform, not to one teacher). */
export const SHARED_RESOURCES = new Set(["vocabulary", "grammarTopics", "readingPassages", "listeningTests", "listeningSections", "writingPrompts", "speakingPrompts", "mockTests"]);

export const canTeacherUse = (resource: string) => OWNED_RESOURCES.has(resource) || SHARED_RESOURCES.has(resource);

/** Fields a teacher may not set (flagged `teacherHidden` in the field config): prices and plan rules are the business's decision. */
const hiddenFields = (resource: string) => (resourceMeta[resource]?.fields ?? []).filter((f) => f.teacherHidden).map((f) => f.key);

const DEFAULT_TEACHER_COURSE_PLAN = "BASIC";

const moduleCourseId = (moduleId: string | null | undefined) => (moduleId ? (db.select().from(modules).where(eq(modules.id, moduleId)).get()?.courseId ?? null) : null);
const lessonCourseId = (lessonId: string | null | undefined) => {
  const lesson = lessonId ? db.select().from(lessons).where(eq(lessons.id, lessonId)).get() : null;
  return lesson ? moduleCourseId(lesson.moduleId) : null;
};
const quizCourseId = (quizId: string | null | undefined) => {
  const quiz = quizId ? db.select().from(quizzes).where(eq(quizzes.id, quizId)).get() : null;
  return quiz ? lessonCourseId(quiz.lessonId) : null;
};

/** The course a record of an owned resource belongs to (null when it belongs to none, which no teacher owns). */
export function courseIdOf(resource: string, record: Record<string, any>): string | null {
  switch (resource) {
    case "courses":
      return record.id ?? null;
    case "modules":
      return record.courseId ?? null;
    case "lessons":
      return moduleCourseId(record.moduleId);
    case "quizzes":
      return lessonCourseId(record.lessonId);
    case "questions":
      return quizCourseId(record.quizId);
    default:
      return null;
  }
}

export function ownsCourse(teacherId: string, courseId: string | null | undefined): boolean {
  if (!courseId) return false;
  return db.select().from(courses).where(eq(courses.id, courseId)).get()?.ownerId === teacherId;
}

export function ownedCourseIds(teacherId: string): string[] {
  return db.select({ id: courses.id }).from(courses).where(eq(courses.ownerId, teacherId)).all().map((c) => c.id);
}

function existingRecord(resource: string, id: string) {
  const table = { courses, modules, lessons, quizzes, questions }[resource as "courses"];
  return table ? (db.select().from(table as any).where(eq((table as any).id, id)).get() as Record<string, any> | undefined) : undefined;
}

const NOT_YOURS = "You can only change content in your own courses.";

/** Removes fields the teacher isn't allowed to send, so they can't be smuggled in with the request. */
function stripHidden(resource: string, body: Record<string, any>) {
  const out = { ...body };
  for (const key of hiddenFields(resource)) delete out[key];
  return out;
}

export function listForTeacher(teacherId: string, resource: string) {
  if (!OWNED_RESOURCES.has(resource)) return listResource(resource);
  const owned = new Set(ownedCourseIds(teacherId));
  return listResource(resource).filter((r: any) => {
    const courseId = courseIdOf(resource, r);
    return !!courseId && owned.has(courseId);
  });
}

export function createForTeacher(teacherId: string, resource: string, body: Record<string, any>) {
  if (!canTeacherUse(resource)) throw new ResourceError("You can't manage this kind of content.");
  if (!OWNED_RESOURCES.has(resource)) return createResource(resource, body);

  let data = stripHidden(resource, body);
  if (resource === "courses") {
    data.requiredPlan = DEFAULT_TEACHER_COURSE_PLAN;
  } else {
    // The parent must be one of the teacher's own.
    if (resource === "quizzes") {
      if (!data.lessonId) throw new ResourceError("Choose the lesson this quiz belongs to.");
      data.type = "LESSON";
    }
    if (!ownsCourse(teacherId, courseIdOf(resource, data))) throw new ResourceError(NOT_YOURS);
  }
  const item = createResource(resource, data);
  if (resource === "courses") db.update(courses).set({ ownerId: teacherId }).where(eq(courses.id, item.id)).run();
  return item;
}

export function updateForTeacher(teacherId: string, resource: string, id: string, body: Record<string, any>) {
  if (!canTeacherUse(resource)) throw new ResourceError("You can't manage this kind of content.");
  if (!OWNED_RESOURCES.has(resource)) return updateResource(resource, id, body);

  const existing = existingRecord(resource, id);
  // The same message whether it is missing or someone else's, so ids can't be probed.
  if (!existing || !ownsCourse(teacherId, courseIdOf(resource, existing))) throw new ResourceError(NOT_YOURS);

  const data = stripHidden(resource, body);
  // Moving a record under another course/module/lesson must land in one of their own.
  if (resource !== "courses" && !ownsCourse(teacherId, courseIdOf(resource, { ...existing, ...data }))) throw new ResourceError(NOT_YOURS);
  updateResource(resource, id, data);
}

export function deleteForTeacher(teacherId: string, resource: string, id: string) {
  if (!canTeacherUse(resource)) throw new ResourceError("You can't manage this kind of content.");
  if (OWNED_RESOURCES.has(resource)) {
    const existing = existingRecord(resource, id);
    if (!existing || !ownsCourse(teacherId, courseIdOf(resource, existing))) throw new ResourceError(NOT_YOURS);
  }
  deleteResource(resource, id);
}


import { db } from "@/lib/db";
import { courses, modules, lessons, progress, bookmarks } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export function listCourses(track?: "ENGLISH" | "IELTS" | "CAREER") {
  const all = db.select().from(courses).where(eq(courses.published, true)).all();
  return track ? all.filter((c) => c.track === track) : all;
}

export function getCourseBySlug(slug: string) {
  return db.select().from(courses).where(eq(courses.slug, slug)).get();
}

export function getModulesForCourse(courseId: string) {
  return db.select().from(modules).where(eq(modules.courseId, courseId)).all();
}

export function getLessonsForModule(moduleId: string) {
  return db.select().from(lessons).where(eq(lessons.moduleId, moduleId)).all();
}

export function getLessonBySlug(slug: string) {
  return db.select().from(lessons).where(eq(lessons.slug, slug)).get();
}

export function getModuleById(moduleId: string) {
  return db.select().from(modules).where(eq(modules.id, moduleId)).get();
}

export function getCourseFullTree(slug: string) {
  const course = getCourseBySlug(slug);
  if (!course) return null;
  const mods = getModulesForCourse(course.id).sort((a, b) => a.order - b.order);
  const tree = mods.map((m) => ({
    ...m,
    lessons: getLessonsForModule(m.id).sort((a, b) => a.order - b.order),
  }));
  return { ...course, modules: tree };
}

export function getUserProgressForCourse(userId: string, courseId: string) {
  const mods = getModulesForCourse(courseId);
  const moduleIds = mods.map((m) => m.id);
  if (moduleIds.length === 0) return { completed: 0, total: 0, percent: 0 };
  const allLessons = db.select().from(lessons).where(inArray(lessons.moduleId, moduleIds)).all();
  const lessonIds = allLessons.map((l) => l.id);
  if (lessonIds.length === 0) return { completed: 0, total: 0, percent: 0 };
  const completedRows = db
    .select()
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.completed, true)))
    .all()
    .filter((p) => lessonIds.includes(p.lessonId));
  const total = lessonIds.length;
  const completed = completedRows.length;
  return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
}

export function isLessonCompleted(userId: string, lessonId: string) {
  const row = db
    .select()
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.lessonId, lessonId)))
    .get();
  return row?.completed ?? false;
}

export function markLessonComplete(userId: string, lessonId: string) {
  const existing = db
    .select()
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.lessonId, lessonId)))
    .get();

  const wasAlreadyComplete = existing?.completed ?? false;

  if (existing) {
    db.update(progress)
      .set({ completed: true, completedAt: new Date().toISOString() })
      .where(eq(progress.id, existing.id))
      .run();
  } else {
    db.insert(progress)
      .values({
        id: crypto.randomUUID(),
        userId,
        lessonId,
        completed: true,
        completedAt: new Date().toISOString(),
      })
      .run();
  }
  return { wasAlreadyComplete };
}

export function countCompletedLessons(userId: string) {
  return db
    .select()
    .from(progress)
    .where(and(eq(progress.userId, userId), eq(progress.completed, true)))
    .all().length;
}

export function toggleBookmark(userId: string, lessonId: string) {
  const existing = db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.lessonId, lessonId)))
    .get();
  if (existing) {
    db.delete(bookmarks).where(eq(bookmarks.id, existing.id)).run();
    return false;
  }
  db.insert(bookmarks).values({ id: crypto.randomUUID(), userId, lessonId }).run();
  return true;
}

export function isBookmarked(userId: string, lessonId: string) {
  return !!db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.lessonId, lessonId)))
    .get();
}

export function recommendedLessons(userId: string, limit = 4) {
  // Simple heuristic: first N incomplete lessons in order
  const all = db.select().from(lessons).all().sort((a, b) => a.order - b.order);
  const done = new Set(
    db
      .select()
      .from(progress)
      .where(and(eq(progress.userId, userId), eq(progress.completed, true)))
      .all()
      .map((p) => p.lessonId)
  );
  return all.filter((l) => !done.has(l.id)).slice(0, limit);
}

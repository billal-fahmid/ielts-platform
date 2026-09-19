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
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { id as newId, slugify } from "@/lib/utils";
import { resourceMeta } from "@/lib/admin/field-config";

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
};

const needsSlug = new Set(["courses", "modules", "lessons", "grammarTopics"]);

export const resources = resourceMeta;

export function listResource(key: string) {
  const table = tables[key];
  if (!table) return [];
  return db.select().from(table).all();
}

export function createResource(key: string, data: Record<string, any>) {
  const table = tables[key];
  if (!table) throw new Error("Unknown resource");
  let payload: any = { id: newId(), ...data };
  if (needsSlug.has(key) && payload.title) {
    payload.slug = slugify(payload.title) + "-" + Math.random().toString(36).slice(2, 6);
  }
  db.insert(table).values(payload).run();
  return payload;
}

export function updateResource(key: string, id: string, data: Record<string, any>) {
  const table = tables[key];
  if (!table) throw new Error("Unknown resource");
  db.update(table).set(data).where(eq(table.id, id)).run();
}

export function deleteResource(key: string, id: string) {
  const table = tables[key];
  if (!table) throw new Error("Unknown resource");
  db.delete(table).where(eq(table.id, id)).run();
}

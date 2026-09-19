import { db } from "@/lib/db";
import { vocabulary, userVocabulary } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { id as newId } from "@/lib/utils";

export function listVocabulary(category?: "DAILY" | "IELTS" | "ACADEMIC" | "GENERAL") {
  const all = db.select().from(vocabulary).all();
  return category ? all.filter((v) => v.category === category) : all;
}

export function getUserVocabStatus(userId: string) {
  return db.select().from(userVocabulary).where(eq(userVocabulary.userId, userId)).all();
}

export function getUserVocabMap(userId: string) {
  const rows = getUserVocabStatus(userId);
  const map = new Map<string, (typeof rows)[number]>();
  rows.forEach((r) => map.set(r.vocabularyId, r));
  return map;
}

export function setVocabStatus(
  userId: string,
  vocabularyId: string,
  status: "NEW" | "LEARNED" | "DIFFICULT",
  boxDelta = 0
) {
  const existing = db
    .select()
    .from(userVocabulary)
    .where(and(eq(userVocabulary.userId, userId), eq(userVocabulary.vocabularyId, vocabularyId)))
    .get();

  if (existing) {
    const newBox = Math.max(1, Math.min(5, existing.boxLevel + boxDelta));
    db.update(userVocabulary)
      .set({ status, boxLevel: newBox, lastReviewed: new Date().toISOString() })
      .where(eq(userVocabulary.id, existing.id))
      .run();
  } else {
    db.insert(userVocabulary)
      .values({
        id: newId(),
        userId,
        vocabularyId,
        status,
        boxLevel: Math.max(1, 1 + boxDelta),
        lastReviewed: new Date().toISOString(),
      })
      .run();
  }
}

export function countLearnedWords(userId: string) {
  return db
    .select()
    .from(userVocabulary)
    .where(and(eq(userVocabulary.userId, userId), eq(userVocabulary.status, "LEARNED")))
    .all().length;
}

export function myVocabulary(userId: string) {
  const rows = getUserVocabStatus(userId);
  const all = db.select().from(vocabulary).all();
  const vocabMap = new Map(all.map((v) => [v.id, v]));
  return rows
    .map((r) => ({ ...vocabMap.get(r.vocabularyId)!, status: r.status, boxLevel: r.boxLevel }))
    .filter((v) => v.id);
}

export function dailyVocabulary(userId: string, limit = 5) {
  const learnedIds = new Set(
    getUserVocabStatus(userId)
      .filter((r) => r.status === "LEARNED")
      .map((r) => r.vocabularyId)
  );
  const all = listVocabulary("DAILY");
  return all.filter((v) => !learnedIds.has(v.id)).slice(0, limit);
}

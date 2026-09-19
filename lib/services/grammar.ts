import { db } from "@/lib/db";
import { grammarTopics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export function listGrammarTopics() {
  return db.select().from(grammarTopics).all().sort((a, b) => a.order - b.order);
}

export function getGrammarTopicBySlug(slug: string) {
  return db.select().from(grammarTopics).where(eq(grammarTopics.slug, slug)).get();
}

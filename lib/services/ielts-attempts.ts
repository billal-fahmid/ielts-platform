import { db } from "@/lib/db";
import { ieltsAttempts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export function getAttempt(attemptId: string) {
  return db.select().from(ieltsAttempts).where(eq(ieltsAttempts.id, attemptId)).get();
}

export function saveAttemptProgress(attemptId: string, answers: Record<string, unknown>, timeSpentSeconds: number) {
  db.update(ieltsAttempts).set({ answers, timeSpentSeconds }).where(eq(ieltsAttempts.id, attemptId)).run();
}

import { db } from "@/lib/db";
import { ieltsAttempts, writingEvaluations, writingSubmissions, speakingEvaluations, speakingSessions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export type EstimatedBands = {
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  overall: number | null;
};

function latestBy<T extends { completedAt?: string | null; createdAt?: string | null }>(rows: T[], key: "completedAt" | "createdAt") {
  return rows.slice().sort((a, b) => ((b[key] as string) || "").localeCompare((a[key] as string) || ""))[0];
}

function latestListeningOrReadingBand(userId: string, skill: "LISTENING" | "READING"): number | null {
  const rows = db
    .select()
    .from(ieltsAttempts)
    .where(and(eq(ieltsAttempts.userId, userId), eq(ieltsAttempts.skill, skill), eq(ieltsAttempts.status, "COMPLETED")))
    .all();
  const latest = latestBy(rows, "completedAt");
  return latest?.bandScore ?? null;
}

function latestWritingBand(userId: string): number | null {
  const submissions = db.select().from(writingSubmissions).where(eq(writingSubmissions.userId, userId)).all();
  if (submissions.length === 0) return null;
  const submissionIds = new Set(submissions.map((s) => s.id));
  const evaluations = db
    .select()
    .from(writingEvaluations)
    .all()
    .filter((e) => submissionIds.has(e.submissionId));
  const latest = latestBy(evaluations, "createdAt");
  return latest?.estimatedBand ?? null;
}

function latestSpeakingBand(userId: string): number | null {
  const sessions = db.select().from(speakingSessions).where(eq(speakingSessions.userId, userId)).all();
  if (sessions.length === 0) return null;
  const sessionIds = new Set(sessions.map((s) => s.id));
  const evaluations = db
    .select()
    .from(speakingEvaluations)
    .all()
    .filter((e) => sessionIds.has(e.sessionId));
  const latest = latestBy(evaluations, "createdAt");
  return latest?.estimatedBand ?? null;
}

export function getEstimatedBands(userId: string): EstimatedBands {
  const listening = latestListeningOrReadingBand(userId, "LISTENING");
  const reading = latestListeningOrReadingBand(userId, "READING");
  const writing = latestWritingBand(userId);
  const speaking = latestSpeakingBand(userId);

  const known = [listening, reading, writing, speaking].filter((v): v is number => v !== null);
  const overall = known.length > 0 ? Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 2) / 2 : null;

  return { listening, reading, writing, speaking, overall };
}

export function examCountdownDays(targetExamDate: string | null | undefined): number | null {
  if (!targetExamDate) return null;
  const target = new Date(targetExamDate);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

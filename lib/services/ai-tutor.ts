import { db } from "@/lib/db";
import { aiTutorConversations, aiTutorMessages } from "@/lib/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { sendTutorMessage, type TutorContext, type TutorLanguage } from "@/lib/ai/tutor";
import { getAIProvider } from "@/lib/ai/provider";
import type { AIProvider } from "@/lib/ai/types";
import { getProfile } from "@/lib/services/users";
import { latestAssessmentResult } from "@/lib/services/quiz";

export const MAX_MESSAGE_CHARS = 2000;
export const DAILY_MESSAGE_LIMIT = 100;

export type TutorMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  language: TutorLanguage | null;
};

export function listConversations(userId: string) {
  return db
    .select()
    .from(aiTutorConversations)
    .where(eq(aiTutorConversations.userId, userId))
    .all()
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function getConversation(conversationId: string) {
  return db.select().from(aiTutorConversations).where(eq(aiTutorConversations.id, conversationId)).get();
}

export function getMessages(conversationId: string): TutorMessage[] {
  return db
    .select()
    .from(aiTutorMessages)
    .where(eq(aiTutorMessages.conversationId, conversationId))
    .orderBy(sql`rowid`)
    .all()
    .map((m) => ({ id: m.id, role: m.role, content: m.content, language: m.language }));
}

export function createConversation(userId: string, firstMessage: string) {
  const conversationId = newId();
  const oneLine = firstMessage.replace(/\s+/g, " ").trim();
  const title = oneLine.length > 60 ? `${oneLine.slice(0, 57)}…` : oneLine;
  db.insert(aiTutorConversations).values({ id: conversationId, userId, title: title || "New conversation" }).run();
  return getConversation(conversationId)!;
}

export function addMessage(conversationId: string, role: "USER" | "ASSISTANT", content: string, language: TutorLanguage | null) {
  const messageId = newId();
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  db.insert(aiTutorMessages).values({ id: messageId, conversationId, role, content, language, createdAt: now }).run();
  db.update(aiTutorConversations).set({ updatedAt: now }).where(eq(aiTutorConversations.id, conversationId)).run();
  return { id: messageId, role, content, language } satisfies TutorMessage;
}

export function deleteConversation(conversationId: string) {
  db.delete(aiTutorMessages).where(eq(aiTutorMessages.conversationId, conversationId)).run();
  db.delete(aiTutorConversations).where(eq(aiTutorConversations.id, conversationId)).run();
}

/** Student messages sent today (UTC) across all conversations, for the daily cost cap. */
export function countUserMessagesToday(userId: string) {
  const ids = listConversations(userId).map((c) => c.id);
  if (ids.length === 0) return 0;
  const today = new Date().toISOString().slice(0, 10);
  return db
    .select()
    .from(aiTutorMessages)
    .where(inArray(aiTutorMessages.conversationId, ids))
    .all()
    .filter((m) => m.role === "USER" && (m.createdAt || "") >= today).length;
}

/** Level, target and weak areas used to tailor the tutor to this student. */
export function getTutorContext(userId: string, language: TutorLanguage): TutorContext {
  const profile = getProfile(userId);
  const weakAreas = latestAssessmentResult(userId)?.weakAreas ?? [];
  return {
    englishLevel: profile?.englishLevel ?? null,
    ieltsTarget: profile?.ieltsTarget ?? null,
    weakAreas,
    language,
  };
}

const inFlight = new Set<string>();

export function isReplyInFlight(conversationId: string) {
  return inFlight.has(conversationId);
}

/**
 * Generates and stores the tutor's reply to the conversation's latest message. Returns the stored
 * message, or a failure reason. The student's message is already saved, so a failure loses nothing.
 */
export async function generateReply(
  conversationId: string,
  userId: string,
  language: TutorLanguage,
  provider: AIProvider = getAIProvider()
): Promise<{ ok: true; message: TutorMessage } | { ok: false; reason: "unavailable" | "error"; message: string }> {
  if (inFlight.has(conversationId)) return { ok: false, reason: "error", message: "The tutor is already replying." };
  inFlight.add(conversationId);
  try {
    const result = await sendTutorMessage(
      { messages: getMessages(conversationId), context: getTutorContext(userId, language) },
      provider
    );
    if (!result.ok) return result;
    return { ok: true, message: addMessage(conversationId, "ASSISTANT", result.data.reply, language) };
  } finally {
    inFlight.delete(conversationId);
  }
}

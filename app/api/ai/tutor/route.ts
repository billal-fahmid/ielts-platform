import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  DAILY_MESSAGE_LIMIT,
  MAX_MESSAGE_CHARS,
  addMessage,
  countUserMessagesToday,
  createConversation,
  generateReply,
  getConversation,
  isReplyInFlight,
} from "@/lib/services/ai-tutor";
import type { TutorLanguage } from "@/lib/ai/tutor";

export const maxDuration = 120;

const LANGUAGES: TutorLanguage[] = ["EN", "BN", "MIXED"];

/** Sends a student message and returns the tutor's reply (or, if the AI is down, just the saved message). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const language = LANGUAGES.includes(body?.language) ? (body.language as TutorLanguage) : "EN";
  if (!message) return NextResponse.json({ error: "Write a message first." }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: `Messages can be up to ${MAX_MESSAGE_CHARS} characters.` }, { status: 400 });
  }

  if (countUserMessagesToday(userId) >= DAILY_MESSAGE_LIMIT) {
    return NextResponse.json(
      { error: `You've reached today's limit of ${DAILY_MESSAGE_LIMIT} tutor messages. Come back tomorrow!` },
      { status: 429 }
    );
  }

  let conversationId = typeof body?.conversationId === "string" ? body.conversationId : null;
  if (conversationId) {
    const existing = getConversation(conversationId);
    if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    if (isReplyInFlight(conversationId)) {
      return NextResponse.json({ error: "The tutor is still replying. Please wait a moment." }, { status: 409 });
    }
  } else {
    conversationId = createConversation(userId, message).id;
  }

  const userMessage = addMessage(conversationId, "USER", message, language);
  const conversation = getConversation(conversationId)!;
  const reply = await generateReply(conversationId, userId, language);

  return NextResponse.json({
    conversationId,
    title: conversation.title,
    userMessage,
    assistantMessage: reply.ok ? reply.message : null,
    replyFailed: !reply.ok,
    failureMessage: reply.ok ? null : reply.message,
  });
}

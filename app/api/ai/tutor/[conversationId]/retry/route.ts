import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateReply, getConversation, getMessages, isReplyInFlight } from "@/lib/services/ai-tutor";

export const maxDuration = 120;

/** Asks the tutor to answer the student's last message again after a failed reply. */
export async function POST(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session.user as any).id;

  const { conversationId } = await params;
  const conversation = getConversation(conversationId);
  if (!conversation || conversation.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (isReplyInFlight(conversationId)) return NextResponse.json({ error: "The tutor is still replying." }, { status: 409 });

  const last = getMessages(conversationId).at(-1);
  if (!last || last.role !== "USER") return NextResponse.json({ error: "There is nothing to retry." }, { status: 409 });

  const reply = await generateReply(conversationId, userId, last.language ?? "EN");
  return NextResponse.json({
    assistantMessage: reply.ok ? reply.message : null,
    replyFailed: !reply.ok,
    failureMessage: reply.ok ? null : reply.message,
  });
}

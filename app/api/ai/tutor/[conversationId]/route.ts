import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteConversation, getConversation, getMessages } from "@/lib/services/ai-tutor";

async function ownedConversation(params: Promise<{ conversationId: string }>) {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  const userId = (session.user as any).id;
  const { conversationId } = await params;
  const conversation = getConversation(conversationId);
  if (!conversation || conversation.userId !== userId) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  return { conversation };
}

export async function GET(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const found = await ownedConversation(params);
  if (found.error) return found.error;
  return NextResponse.json({ conversationId: found.conversation.id, title: found.conversation.title, messages: getMessages(found.conversation.id) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const found = await ownedConversation(params);
  if (found.error) return found.error;
  deleteConversation(found.conversation.id);
  return NextResponse.json({ ok: true });
}

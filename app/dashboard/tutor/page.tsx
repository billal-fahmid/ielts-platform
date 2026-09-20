import { auth } from "@/lib/auth";
import { getProfile } from "@/lib/services/users";
import { getConversation, getMessages, listConversations } from "@/lib/services/ai-tutor";
import { TutorChat } from "@/components/tutor/tutor-chat";
import { LEVEL_LABELS } from "@/lib/utils";

export default async function TutorPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const session = await auth();
  const userId = (session!.user as any).id;
  const profile = getProfile(userId);

  const conversations = listConversations(userId).map((conv) => ({ id: conv.id, title: conv.title }));
  const active = c ? getConversation(c) : undefined;
  const activeConversation = active && active.userId === userId ? active : null;

  const level = profile?.englishLevel ?? null;
  const levelLabel = level ? `${level} · ${LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}` : null;

  return (
    <TutorChat
      initialConversations={conversations}
      initialConversationId={activeConversation?.id ?? null}
      initialMessages={activeConversation ? getMessages(activeConversation.id) : []}
      levelLabel={levelLabel}
      defaultLanguage={level === "A1" || level === "A2" ? "MIXED" : "EN"}
    />
  );
}

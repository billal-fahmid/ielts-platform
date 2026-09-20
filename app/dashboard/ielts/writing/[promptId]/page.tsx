import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPrompt, startOrResumeDraft } from "@/lib/services/writing";
import { WritingEditor } from "@/components/ielts/writing-editor";

export default async function WritingEditorPage({ params }: { params: Promise<{ promptId: string }> }) {
  const { promptId } = await params;
  const session = await auth();
  const userId = (session!.user as any).id;

  const prompt = getPrompt(promptId);
  if (!prompt || !prompt.published) notFound();

  const draft = startOrResumeDraft(userId, promptId);

  return (
    <WritingEditor
      submissionId={draft.id}
      prompt={{
        taskType: prompt.taskType,
        category: prompt.category,
        promptText: prompt.promptText,
        imageUrl: prompt.imageUrl,
        visualDescription: prompt.visualDescription,
      }}
      initialContent={draft.content}
      initialTimeSpentSeconds={draft.timeSpentSeconds}
    />
  );
}

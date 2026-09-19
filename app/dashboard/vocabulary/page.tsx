import { auth } from "@/lib/auth";
import { listVocabulary, getUserVocabMap, myVocabulary } from "@/lib/services/vocabulary";
import { VocabularyTabs } from "./vocabulary-tabs";

export default async function VocabularyPage() {
  const session = await auth();
  const userId = (session!.user as any).id;

  const daily = listVocabulary("DAILY");
  const ielts = listVocabulary("IELTS");
  const academic = listVocabulary("ACADEMIC");
  const statusMap = getUserVocabMap(userId);
  const mine = myVocabulary(userId);

  const serialize = (list: ReturnType<typeof listVocabulary>) =>
    list.map((v) => ({ ...v, status: statusMap.get(v.id)?.status ?? "NEW" }));

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Vocabulary</h1>
      <p className="mt-1 text-sm text-ink-soft">Build your word bank, one word at a time.</p>

      <VocabularyTabs
        daily={serialize(daily)}
        ielts={serialize(ielts)}
        academic={serialize(academic)}
        mine={mine.map((v) => ({ ...v, status: v.status }))}
      />
    </div>
  );
}

import { auth } from "@/lib/auth";
import { listVocabulary, getUserVocabMap } from "@/lib/services/vocabulary";
import { FlashcardDeck } from "./deck";

export default async function FlashcardsPage() {
  const session = await auth();
  const userId = (session!.user as any).id;

  const all = listVocabulary();
  const statusMap = getUserVocabMap(userId);
  const notLearned = all.filter((v) => statusMap.get(v.id)?.status !== "LEARNED").slice(0, 15);

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Flashcards</h1>
      <p className="mt-1 text-sm text-ink-soft">Flip each card, then rate how well you knew it.</p>

      <div className="mt-6 flex justify-center">
        <FlashcardDeck
          words={notLearned.map((w) => ({
            id: w.id,
            word: w.word,
            meaning: w.meaning,
            banglaMeaning: w.banglaMeaning,
            example: w.example,
          }))}
        />
      </div>
    </div>
  );
}

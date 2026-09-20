import { getEntitlements, vocabAllowance } from "@/lib/services/plans";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { setVocabStatus, countLearnedWords } from "@/lib/services/vocabulary";
import { awardXp, checkAndAwardBadges } from "@/lib/services/gamification";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const userId = (session.user as any).id;

  const allowance = vocabAllowance(userId, getEntitlements(userId), id);
  if (!allowance.allowed) {
    return NextResponse.json(
      { error: `You've reached today's limit of ${allowance.limit} new words on the Free plan. It resets tomorrow, or upgrade for unlimited vocabulary.`, upgrade: true, feature: "VOCABULARY" },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action as "learned" | "difficult" | "easy" | "medium" | "hard";

  const deltaMap: Record<string, number> = { easy: 1, medium: 0, hard: -1, learned: 1, difficult: -1 };
  const statusMap: Record<string, "NEW" | "LEARNED" | "DIFFICULT"> = {
    easy: "LEARNED",
    medium: "NEW",
    hard: "DIFFICULT",
    learned: "LEARNED",
    difficult: "DIFFICULT",
  };

  setVocabStatus(userId, id, statusMap[action] ?? "NEW", deltaMap[action] ?? 0);

  let xpResult = null;
  if (action === "learned" || action === "easy") {
    xpResult = await awardXp(userId, 5);
    const learnedCount = countLearnedWords(userId);
    await checkAndAwardBadges(userId, { wordsLearned: learnedCount });
  }

  return NextResponse.json({ ok: true, xp: xpResult });
}

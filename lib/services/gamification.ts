import { db } from "@/lib/db";
import { profiles, badges, userBadges } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { gLevelFromXp, id as newId } from "@/lib/utils";
import { notify } from "@/lib/services/notifications";

const STREAK_MILESTONES = new Set([3, 7, 14, 30, 60, 100]);

export async function awardXp(userId: string, amount: number) {
  const profile = db.select().from(profiles).where(eq(profiles.userId, userId)).get();
  if (!profile) return;

  const newXp = profile.xp + amount;
  const { level } = gLevelFromXp(newXp);

  const today = new Date().toISOString().slice(0, 10);
  const last = profile.lastStudyDate;
  let streak = profile.streak;
  if (last !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streak = last === yesterday ? streak + 1 : 1;
  }

  db.update(profiles)
    .set({ xp: newXp, gLevel: level, streak, lastStudyDate: today })
    .where(eq(profiles.userId, userId))
    .run();

  if (last !== today && STREAK_MILESTONES.has(streak)) {
    notify(userId, { type: "STREAK", title: `${streak}-day streak!`, body: `You have studied ${streak} days in a row. Keep it going!`, url: "/dashboard/progress" });
  }

  await checkAndAwardBadges(userId, { streak, xp: newXp });

  return { xp: newXp, level, streak };
}

async function ensureBadge(code: string, title: string, description: string, icon: string) {
  const existing = db.select().from(badges).where(eq(badges.code, code)).get();
  if (existing) return existing;
  const b = { id: newId(), code, title, description, icon };
  db.insert(badges).values(b).run();
  return b;
}

async function grantBadgeIfMissing(userId: string, badgeId: string) {
  const has = db
    .select()
    .from(userBadges)
    .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
    .get();
  if (!has) {
    db.insert(userBadges).values({ id: newId(), userId, badgeId }).run();
    const badge = db.select().from(badges).where(eq(badges.id, badgeId)).get();
    if (badge) notify(userId, { type: "ACHIEVEMENT", title: `Badge earned: ${badge.title}`, body: badge.description, url: "/dashboard/progress" });
    return true;
  }
  return false;
}

export async function checkAndAwardBadges(
  userId: string,
  ctx: { streak?: number; xp?: number; lessonsCompleted?: number; wordsLearned?: number; mockTestsCompleted?: number }
) {
  const newlyAwarded: string[] = [];

  if (ctx.streak === 7) {
    const b = await ensureBadge("STREAK_7", "7 Day Streak", "Studied 7 days in a row", "Flame");
    if (await grantBadgeIfMissing(userId, b.id)) newlyAwarded.push(b.title);
  }
  if (ctx.wordsLearned && ctx.wordsLearned >= 100) {
    const b = await ensureBadge("WORDS_100", "100 Words", "Learned 100 vocabulary words", "BookOpen");
    if (await grantBadgeIfMissing(userId, b.id)) newlyAwarded.push(b.title);
  }
  if (ctx.lessonsCompleted === 1) {
    const b = await ensureBadge("FIRST_LESSON", "First Lesson", "Completed your first lesson", "GraduationCap");
    if (await grantBadgeIfMissing(userId, b.id)) newlyAwarded.push(b.title);
  }

  if (ctx.mockTestsCompleted && ctx.mockTestsCompleted >= 1) {
    const b = await ensureBadge("FIRST_MOCK", "First Mock Test", "Completed your first IELTS mock test", "FileCheck");
    if (await grantBadgeIfMissing(userId, b.id)) newlyAwarded.push(b.title);
  }

  return newlyAwarded;
}

export async function awardGrammarMasterIfEligible(userId: string, completedTopics: number, totalTopics: number) {
  if (totalTopics > 0 && completedTopics >= totalTopics) {
    const b = await ensureBadge("GRAMMAR_MASTER", "Grammar Master", "Completed every Grammar Lab topic", "Sparkles");
    return grantBadgeIfMissing(userId, b.id);
  }
  return false;
}

export function listUserBadges(userId: string) {
  return db
    .select({ badge: badges, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId))
    .all();
}

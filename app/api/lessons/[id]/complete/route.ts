import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { markLessonComplete, countCompletedLessons } from "@/lib/services/courses";
import { awardXp } from "@/lib/services/gamification";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { courseIdForLesson, syncCourseCompletion } from "@/lib/services/enrollment";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { id } = await params;
  const userId = (session.user as any).id;

  const lesson = db.select().from(lessons).where(eq(lessons.id, id)).get();
  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const { wasAlreadyComplete } = markLessonComplete(userId, id);

  let xpResult = null;
  let newlyAwarded: string[] = [];
  if (!wasAlreadyComplete) {
    xpResult = await awardXp(userId, lesson.xpReward);
    const completedCount = countCompletedLessons(userId);
    if (completedCount === 1) {
      const { checkAndAwardBadges } = await import("@/lib/services/gamification");
      newlyAwarded = await checkAndAwardBadges(userId, { lessonsCompleted: completedCount });
    }
  }

  const courseId = courseIdForLesson(id);
  const courseCompleted = courseId ? syncCourseCompletion(userId, courseId) : false;

  return NextResponse.json({ ok: true, xp: xpResult, newlyAwarded, alreadyCompleted: wasAlreadyComplete, courseCompleted });
}

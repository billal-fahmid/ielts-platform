import { db } from "@/lib/db";
import { profiles, users, writingEvaluations, writingReviews, writingSubmissions } from "@/lib/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { cleanText } from "@/lib/security/http";
import { notify } from "@/lib/services/notifications";
import { TeachingError } from "@/lib/services/teaching";
import { MIN_SUBMIT_WORDS } from "@/lib/ielts/writing";
import { BAND_PROBLEM, isValidBand, MAX_FEEDBACK_CHARS, MAX_OPEN_REVIEWS } from "@/lib/reviews/rules";

export type WritingReview = typeof writingReviews.$inferSelect;

const OPEN: WritingReview["status"][] = ["REQUESTED", "IN_REVIEW"];

const getReview = (id: string) => db.select().from(writingReviews).where(eq(writingReviews.id, id)).get();
const nameOf = (userId: string | null) => (userId ? (db.select({ name: users.name }).from(users).where(eq(users.id, userId)).get()?.name ?? "A teacher") : null);

// ---------- Student side ----------

/** Asks for a teacher to review a submitted essay. One live review per essay; a few open requests at a time. */
export function requestReview(studentId: string, submissionId: string, note?: string | null): WritingReview {
  const submission = db.select().from(writingSubmissions).where(eq(writingSubmissions.id, submissionId)).get();
  // The same message whether the essay is missing or someone else's.
  if (!submission || submission.userId !== studentId) throw new TeachingError("That essay doesn't exist.", 404);
  if (submission.status === "DRAFT") throw new TeachingError("Submit your essay first, then ask a teacher to review it.");
  if (submission.wordCount < MIN_SUBMIT_WORDS) throw new TeachingError(`Your essay is very short (under ${MIN_SUBMIT_WORDS} words). Write more before asking a teacher to review it.`);

  const existing = db.select().from(writingReviews).where(eq(writingReviews.submissionId, submissionId)).all().find((r) => r.status !== "CANCELLED");
  if (existing) throw new TeachingError(existing.status === "COMPLETED" ? "A teacher has already reviewed this essay." : "You've already asked a teacher to review this essay.");

  const openCount = db.select().from(writingReviews).where(and(eq(writingReviews.studentId, studentId), inArray(writingReviews.status, OPEN))).all().length;
  if (openCount >= MAX_OPEN_REVIEWS) throw new TeachingError(`You already have ${MAX_OPEN_REVIEWS} reviews waiting. Wait for one to finish before asking for another.`);

  const id = newId();
  db.insert(writingReviews)
    .values({ id, submissionId, studentId, studentNote: note ? cleanText(note).slice(0, 1000) || null : null })
    .run();
  return getReview(id)!;
}

/** A student withdraws a request that no teacher has picked up yet. */
export function cancelRequest(studentId: string, reviewId: string) {
  const r = getReview(reviewId);
  if (!r || r.studentId !== studentId) throw new TeachingError("That review request doesn't exist.", 404);
  if (r.status !== "REQUESTED") throw new TeachingError(r.status === "IN_REVIEW" ? "A teacher has already started this review, so it can't be cancelled." : "This request can't be cancelled.");
  db.update(writingReviews).set({ status: "CANCELLED" }).where(and(eq(writingReviews.id, reviewId), eq(writingReviews.status, "REQUESTED"))).run();
}

/** The live review (not cancelled) for an essay, if any. Only the essay's owner gets it. */
export function reviewForSubmission(studentId: string, submissionId: string) {
  const r = db.select().from(writingReviews).where(and(eq(writingReviews.submissionId, submissionId), eq(writingReviews.studentId, studentId))).all().find((x) => x.status !== "CANCELLED");
  return r ? { ...r, teacherName: nameOf(r.teacherId) } : null;
}

export function listStudentReviews(studentId: string) {
  return db
    .select()
    .from(writingReviews)
    .where(eq(writingReviews.studentId, studentId))
    .orderBy(desc(writingReviews.requestedAt))
    .all()
    .filter((r) => r.status !== "CANCELLED")
    .map((r) => {
      const s = db.select().from(writingSubmissions).where(eq(writingSubmissions.id, r.submissionId)).get();
      return { ...r, teacherName: nameOf(r.teacherId), taskType: s?.taskType ?? "TASK2", wordCount: s?.wordCount ?? 0, promptText: s?.promptTextSnapshot ?? "" };
    });
}

// ---------- Teacher side ----------

function summary(r: WritingReview) {
  const s = db.select().from(writingSubmissions).where(eq(writingSubmissions.id, r.submissionId)).get();
  const target = db.select({ t: profiles.ieltsTarget }).from(profiles).where(eq(profiles.userId, r.studentId)).get()?.t ?? null;
  return { ...r, studentName: nameOf(r.studentId) ?? "Student", taskType: (s?.taskType ?? "TASK2") as "TASK1" | "TASK2", wordCount: s?.wordCount ?? 0, targetBand: target };
}

/** Requests waiting for any teacher to pick up, oldest first. Shows no essay text. */
export function reviewQueue() {
  return db.select().from(writingReviews).where(eq(writingReviews.status, "REQUESTED")).orderBy(writingReviews.requestedAt).all().map(summary);
}

export function myReviews(teacherId: string) {
  return db
    .select()
    .from(writingReviews)
    .where(and(eq(writingReviews.teacherId, teacherId), inArray(writingReviews.status, ["IN_REVIEW", "COMPLETED"])))
    .orderBy(desc(writingReviews.requestedAt))
    .all()
    .map(summary);
}

export const queueCount = () => db.select().from(writingReviews).where(eq(writingReviews.status, "REQUESTED")).all().length;

/** Picks a request up. Only one teacher can win it, even if two click at once. */
export function claimReview(teacherId: string, reviewId: string): WritingReview {
  const r = getReview(reviewId);
  if (!r) throw new TeachingError("That review request doesn't exist.", 404);
  const res = db
    .update(writingReviews)
    .set({ teacherId, status: "IN_REVIEW", claimedAt: new Date().toISOString() })
    .where(and(eq(writingReviews.id, reviewId), eq(writingReviews.status, "REQUESTED")))
    .run();
  if (res.changes !== 1) throw new TeachingError("Someone else has already picked up this review, or it was cancelled.");
  notify(r.studentId, { type: "TEACHER_FEEDBACK", title: "A teacher is reviewing your essay", body: `${nameOf(teacherId)} has started your writing review.`, url: `/dashboard/ielts/writing/submission/${r.submissionId}` });
  return getReview(reviewId)!;
}

/** Puts an unfinished review back in the queue. Any draft notes are cleared so the next teacher starts fresh. */
export function releaseReview(teacherId: string, reviewId: string) {
  const r = getReview(reviewId);
  if (!r || r.teacherId !== teacherId) throw new TeachingError("That review doesn't exist.", 404);
  if (r.status !== "IN_REVIEW") throw new TeachingError("Only a review in progress can be put back in the queue.");
  db.update(writingReviews)
    .set({ teacherId: null, status: "REQUESTED", claimedAt: null, bandEstimate: null, taskResponseFeedback: null, coherenceFeedback: null, vocabularyFeedback: null, grammarFeedback: null, overallComments: null })
    .where(eq(writingReviews.id, reviewId))
    .run();
}

/**
 * Everything the reviewing teacher needs. The essay is included only for the teacher who picked the review up;
 * everyone else gets nothing (queue entries have their own essay-free summary).
 */
export function reviewForTeacher(teacherId: string, reviewId: string) {
  const r = getReview(reviewId);
  if (!r) return null;
  const s = summary(r);
  const mine = r.teacherId === teacherId;
  if (!mine && r.status !== "REQUESTED") return null;
  if (!mine) return { review: s, essay: null };
  const sub = db.select().from(writingSubmissions).where(eq(writingSubmissions.id, r.submissionId)).get();
  const ai = db.select().from(writingEvaluations).where(eq(writingEvaluations.submissionId, r.submissionId)).get() ?? null;
  return { review: s, essay: sub ? { prompt: sub.promptTextSnapshot, content: sub.content, wordCount: sub.wordCount, taskType: sub.taskType, timeSpentSeconds: sub.timeSpentSeconds } : null, ai };
}

export type ReviewInput = {
  bandEstimate?: number | null;
  taskResponseFeedback?: string | null;
  coherenceFeedback?: string | null;
  vocabularyFeedback?: string | null;
  grammarFeedback?: string | null;
  overallComments?: string | null;
};

const clean = (v: string | null | undefined) => (v ? cleanText(v).slice(0, MAX_FEEDBACK_CHARS) || null : null);

/**
 * Saves the teacher's review. `complete` publishes it to the student (needs a band and overall comments).
 * A finished review can still be corrected by the same teacher.
 */
export function saveReview(teacherId: string, reviewId: string, input: ReviewInput, complete: boolean): WritingReview {
  const r = getReview(reviewId);
  if (!r || r.teacherId !== teacherId) throw new TeachingError("That review doesn't exist.", 404);
  if (r.status !== "IN_REVIEW" && r.status !== "COMPLETED") throw new TeachingError("Pick up the review before writing feedback.");

  const band = input.bandEstimate ?? null;
  if (band !== null && !isValidBand(band)) throw new TeachingError(BAND_PROBLEM);
  const values = {
    bandEstimate: band,
    taskResponseFeedback: clean(input.taskResponseFeedback),
    coherenceFeedback: clean(input.coherenceFeedback),
    vocabularyFeedback: clean(input.vocabularyFeedback),
    grammarFeedback: clean(input.grammarFeedback),
    overallComments: clean(input.overallComments),
  };
  const finishing = complete || r.status === "COMPLETED";
  if (finishing) {
    if (values.bandEstimate === null) throw new TeachingError("Give a band estimate before finishing the review.");
    if (!values.overallComments) throw new TeachingError("Write some overall comments before finishing the review.");
  }

  db.update(writingReviews)
    .set({ ...values, ...(complete && r.status === "IN_REVIEW" ? { status: "COMPLETED" as const, completedAt: new Date().toISOString() } : {}) })
    .where(eq(writingReviews.id, reviewId))
    .run();

  if (complete && r.status === "IN_REVIEW") {
    notify(r.studentId, {
      type: "TEACHER_FEEDBACK",
      title: "Your teacher reviewed your writing",
      body: `${nameOf(teacherId)} estimates Band ${values.bandEstimate}. Read their feedback next to the AI feedback.`,
      url: `/dashboard/ielts/writing/submission/${r.submissionId}`,
      email: true,
    });
  }
  return getReview(reviewId)!;
}

import { db } from "@/lib/db";
import { batchMembers, batches, enrollments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Batches a student belongs to. */
export const batchIdsOfStudent = (studentId: string): string[] =>
  db
    .select({ id: batchMembers.batchId })
    .from(batchMembers)
    .innerJoin(batches, eq(batches.id, batchMembers.batchId))
    .where(eq(batchMembers.studentId, studentId))
    .all()
    .map((r) => r.id);

/** Courses a student is currently enrolled in. */
export const courseIdsOfStudent = (studentId: string): string[] =>
  db
    .select()
    .from(enrollments)
    .where(eq(enrollments.userId, studentId))
    .all()
    .filter((e) => e.status !== "DROPPED")
    .map((e) => e.courseId);

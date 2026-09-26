import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { certificates, courses, enrollments, users } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { id as newId } from "@/lib/utils";
import { cleanText } from "@/lib/security/http";
import { notify } from "@/lib/services/notifications";
import { TeachingError } from "@/lib/services/teaching";
import { CODE_ALPHABET, formatCertificateCode, normalizeCertificateCode } from "@/lib/growth/rules";

export type Certificate = typeof certificates.$inferSelect;

const newCode = () => formatCertificateCode(Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(""));

/**
 * Issues the certificate for a finished course (once; asking again returns the same one). Only students who really
 * completed the course get one, and the names are frozen as they are now.
 */
export function issueCertificate(userId: string, courseId: string, opts: { silent?: boolean } = {}): Certificate | null {
  const enrollment = db.select().from(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId))).get();
  if (!enrollment || enrollment.status !== "COMPLETED") return null;
  const existing = db.select().from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId))).get();
  if (existing) return existing;
  const student = db.select().from(users).where(eq(users.id, userId)).get();
  const course = db.select().from(courses).where(eq(courses.id, courseId)).get();
  if (!student || !course) return null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = db.insert(certificates).values({ id: newId(), code: newCode(), userId, courseId, studentName: student.name, courseTitle: course.title }).onConflictDoNothing().run();
    if (res.changes === 1) break;
    if (db.select().from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId))).get()) break; // a parallel request issued it
  }
  const cert = db.select().from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.courseId, courseId))).get() ?? null;
  if (cert && !existing && !opts.silent) notify(userId, { type: "ACHIEVEMENT", title: `Certificate ready: ${course.title}`, body: "You finished the course. Download or share your certificate.", url: `/dashboard/certificates/${cert.id}` });
  return cert;
}

/** Issues certificates for every completed course that doesn't have one yet (for students who finished before this existed). */
export function issueMissingCertificates(userId: string): number {
  let n = 0;
  for (const e of db.select().from(enrollments).where(and(eq(enrollments.userId, userId), eq(enrollments.status, "COMPLETED"))).all()) {
    const had = db.select().from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.courseId, e.courseId))).get();
    if (!had && issueCertificate(userId, e.courseId)) n++;
  }
  return n;
}

export const listCertificates = (userId: string) => db.select().from(certificates).where(eq(certificates.userId, userId)).orderBy(desc(certificates.issuedAt)).all();

export function getCertificateForUser(userId: string, id: string): Certificate | null {
  const c = db.select().from(certificates).where(eq(certificates.id, id)).get();
  return c && c.userId === userId ? c : null;
}

export type Verification = { code: string; status: "VALID" | "REVOKED"; studentName: string; courseTitle: string; issuedAt: string };

/** What the public verification page shows. It reveals only what is printed on the certificate. Unknown codes give null. */
export function verifyCertificate(raw: string | null | undefined): Verification | null {
  const code = normalizeCertificateCode(raw);
  if (!code) return null;
  const c = db.select().from(certificates).where(eq(certificates.code, code)).get();
  return c ? { code: c.code, status: c.revokedAt ? "REVOKED" : "VALID", studentName: c.studentName, courseTitle: c.courseTitle, issuedAt: c.issuedAt } : null;
}

// ---------- Admin ----------

const requireAdmin = (role: string) => {
  if (role !== "ADMIN") throw new TeachingError("Only administrators can do that.", 403);
};

export function listAllCertificates(role: string, limit = 200) {
  requireAdmin(role);
  return db.select().from(certificates).orderBy(desc(certificates.issuedAt)).limit(limit).all();
}

export function setRevoked(role: string, id: string, revoked: boolean, reason?: string | null) {
  requireAdmin(role);
  const c = db.select().from(certificates).where(eq(certificates.id, id)).get();
  if (!c) throw new TeachingError("That certificate doesn't exist.", 404);
  db.update(certificates)
    .set(revoked ? { revokedAt: new Date().toISOString(), revokedReason: reason ? cleanText(reason).slice(0, 300) || null : null } : { revokedAt: null, revokedReason: null })
    .where(eq(certificates.id, id))
    .run();
}

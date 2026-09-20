import { db } from "@/lib/db";
import { users, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { id as newId } from "@/lib/utils";

export async function createUser(name: string, email: string, password: string) {
  const existing = db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  if (existing) throw new Error("An account with this email already exists");

  const passwordHash = await bcrypt.hash(password, 12);
  const userId = newId();

  db.insert(users)
    .values({
      id: userId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: "STUDENT",
    })
    .run();

  db.insert(profiles)
    .values({
      id: newId(),
      userId,
      onboardingCompleted: false,
      xp: 0,
      gLevel: 1,
      streak: 0,
    })
    .run();

  return userId;
}

export function getProfile(userId: string) {
  return db.select().from(profiles).where(eq(profiles.userId, userId)).get();
}

export function getUserWithProfile(userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  const profile = getProfile(userId);
  return user ? { ...user, profile } : null;
}

export function updateProfile(userId: string, data: Partial<typeof profiles.$inferInsert>) {
  db.update(profiles).set(data).where(eq(profiles.userId, userId)).run();
}

export function listUsers() {
  return db.select().from(users).all();
}

export function updateUserRole(userId: string, role: "STUDENT" | "TEACHER" | "ADMIN") {
  db.update(users).set({ role }).where(eq(users.id, userId)).run();
}

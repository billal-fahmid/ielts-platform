/**
 * Creates the first administrator (or promotes and re-passwords an existing account) on a live install.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='a-long-passphrase' npm run admin:create
 *
 * The password is read from the environment so it never appears in shell history arguments or logs.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { users, profiles } from "../lib/db/schema";
import { id } from "../lib/utils";

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME || "Administrator").trim();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Set ADMIN_EMAIL to a valid email address.");
  if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters.");
  if (/^(password|admin123|12345678)/i.test(password)) throw new Error("Choose a stronger ADMIN_PASSWORD.");

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) {
    db.update(users).set({ role: "ADMIN", passwordHash }).where(eq(users.id, existing.id)).run();
    console.log(`Updated ${email}: now an administrator with the new password.`);
    return;
  }
  const userId = id();
  db.insert(users).values({ id: userId, name, email, passwordHash, role: "ADMIN" }).run();
  db.insert(profiles).values({ id: id(), userId, onboardingCompleted: true, xp: 0, gLevel: 1, streak: 0 }).run();
  console.log(`Created administrator ${email}.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

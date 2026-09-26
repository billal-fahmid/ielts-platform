import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, profiles } from "@/lib/db/schema";
import { id as newId } from "@/lib/utils";
import { notify } from "@/lib/services/notifications";
import { recordRegistration } from "@/lib/services/referrals";
import { logError } from "@/lib/security/error-log";

export type GoogleIdentity = { sub: string; email: string | null | undefined; emailVerified: boolean | undefined; name?: string | null; image?: string | null };
export type SignedInUser = { id: string; role: "STUDENT" | "TEACHER" | "ADMIN"; name: string; sessionVersion: number };

/** A password nobody knows, so the account can only be entered another way. */
const unusablePassword = () => bcrypt.hashSync(randomBytes(32).toString("hex"), 10);

/** Why a Google sign-in was refused. The code is shown to the person as a plain message on the login page. */
export class OAuthError extends Error {
  constructor(public code: "UNVERIFIED_EMAIL" | "STAFF_ACCOUNT" | "NO_EMAIL") {
    super(code);
  }
}

/**
 * Finds or creates the account for a Google sign-in.
 * - Known Google account: sign in.
 * - Same email as an existing student (Google confirms the address is theirs): link the two, so one person has one account.
 * - Same email as a teacher or administrator: refused. Staff accounts are never linked by email address alone.
 * - New email: create a student account with no usable password (they can only sign in with Google).
 */
export function signInWithGoogle(g: GoogleIdentity, referralCode?: string | null): SignedInUser {
  const email = (g.email ?? "").trim().toLowerCase();
  if (!g.sub) throw new OAuthError("NO_EMAIL");
  if (!email) throw new OAuthError("NO_EMAIL");
  if (g.emailVerified !== true) throw new OAuthError("UNVERIFIED_EMAIL");

  const bySub = db.select().from(users).where(eq(users.googleSub, g.sub)).get();
  if (bySub) return { id: bySub.id, role: bySub.role, name: bySub.name, sessionVersion: bySub.sessionVersion };

  const byEmail = db.select().from(users).where(eq(users.email, email)).get();
  if (byEmail) {
    if (byEmail.role !== "STUDENT") throw new OAuthError("STAFF_ACCOUNT");
    // Nobody ever proved they own this address (password sign-ups aren't verified), so whoever chose its password may
    // not be the owner. Google just proved the owner is here: reset the password and end every other session, so anyone
    // who registered the address first is locked out. A verified account is simply linked.
    const takeover = !byEmail.emailVerifiedAt;
    const sessionVersion = byEmail.sessionVersion + (takeover ? 1 : 0);
    db.update(users)
      .set({
        googleSub: g.sub,
        image: byEmail.image ?? g.image ?? null,
        emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date().toISOString(),
        ...(takeover ? { passwordHash: unusablePassword(), sessionVersion } : {}),
      })
      .where(eq(users.id, byEmail.id))
      .run();
    if (takeover) {
      try {
        notify(byEmail.id, { type: "SYSTEM", title: "You signed in with Google", body: "We confirmed your email with Google, so your old password no longer works. Keep signing in with Google.", email: true });
      } catch (e) {
        logError("oauth:google:notice", e, { userId: byEmail.id });
      }
    }
    return { id: byEmail.id, role: byEmail.role, name: byEmail.name, sessionVersion };
  }

  const userId = newId();
  // Nobody knows this password, so the account can only be entered through Google.
  const passwordHash = unusablePassword();
  const name = ((g.name ?? "").trim() || email.split("@")[0]).slice(0, 80) || "Student";
  db.transaction((tx) => {
    tx.insert(users).values({ id: userId, name, email, passwordHash, role: "STUDENT", image: g.image ?? null, googleSub: g.sub, emailVerifiedAt: new Date().toISOString() }).run();
    tx.insert(profiles).values({ id: newId(), userId, onboardingCompleted: false, xp: 0, gLevel: 1, streak: 0 }).run();
  });
  try {
    notify(userId, { type: "SYSTEM", title: "Welcome to BanglaEnglish!", body: "Take the placement test to find your level, then start your first lesson.", url: "/dashboard/assessment", email: true });
    recordRegistration(referralCode ?? null, userId);
  } catch (e) {
    logError("oauth:google:welcome", e, { userId });
  }
  return { id: userId, role: "STUDENT", name, sessionVersion: 0 };
}

/** The account for a Google id, used to build the session after sign-in. */
export function userForGoogleSub(sub: string): SignedInUser | null {
  const u = db.select().from(users).where(eq(users.googleSub, sub)).get();
  return u ? { id: u.id, role: u.role, name: u.name, sessionVersion: u.sessionVersion } : null;
}

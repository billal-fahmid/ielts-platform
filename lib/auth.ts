import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { REFERRAL_COOKIE } from "@/lib/growth/rules";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { checkRateLimit, resetRateLimit } from "@/lib/security/rate-limit";

/** Google sign-in is offered only when both keys are set (see .env.example). */
export const googleEnabled = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Google: find or create the student account before the session starts. Refused sign-ins go to the login page.
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const { signInWithGoogle, OAuthError } = await import("@/lib/services/oauth");
      try {
        let ref: string | null = null;
        try {
          const raw = (await cookies()).get(REFERRAL_COOKIE)?.value;
          ref = raw ? decodeURIComponent(raw) : null;
        } catch {}
        signInWithGoogle({ sub: account.providerAccountId, email: profile?.email, emailVerified: profile?.email_verified as boolean | undefined, name: profile?.name, image: profile?.picture as string | undefined }, ref);
        return true;
      } catch (e) {
        if (e instanceof OAuthError) return "/login?error=" + e.code;
        console.error("[auth] Google sign-in failed", e);
        return "/login?error=GOOGLE_FAILED";
      }
    },
    // The session carries our own user id and role, looked up from the Google account id.
    async jwt({ token, user, account }) {
      if (account?.provider === "google") {
        const { userForGoogleSub } = await import("@/lib/services/oauth");
        const u = userForGoogleSub(account.providerAccountId);
        if (u) {
          token.id = u.id;
          token.role = u.role;
          token.name = u.name;
          token.sv = u.sessionVersion;
        }
        return token;
      }
      if (user) {
        // Signing in with a password.
        const t = await authConfig.callbacks!.jwt!({ token, user } as any);
        (t as any).sv = (user as any).sv ?? 0;
        return t;
      }
      // Every later request: the account must still exist and the token must be from the current session version, so
      // a deleted account or a "sign out everywhere" (sessionVersion raised) ends existing logins straight away.
      if (token.id) {
        const { db } = await import("@/lib/db");
        const { users } = await import("@/lib/db/schema");
        const { eq } = await import("drizzle-orm");
        const row = db.select({ v: users.sessionVersion }).from(users).where(eq(users.id, token.id as string)).get();
        if (!row || row.v !== ((token as any).sv ?? 0)) return null;
      }
      return token;
    },
  },
  providers: [
    ...(googleEnabled() ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })] : []),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password || typeof email !== "string" || typeof password !== "string") return null;

        // Slow down password guessing: after 10 tries in 15 minutes for one account, stop checking.
        // Failed and locked attempts look identical, so this doesn't reveal whether an account exists.
        const throttleKey = email.toLowerCase().slice(0, 254);
        const attempt = checkRateLimit("login", throttleKey, 10, 15 * 60);
        if (!attempt.ok) return null;

        // Lazy-require the DB layer so it's never pulled into the Edge bundle.
        const { db } = await import("@/lib/db");
        const { users } = await import("@/lib/db/schema");
        const { eq } = await import("drizzle-orm");

        const user = db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        resetRateLimit("login", throttleKey);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          sv: user.sessionVersion,
        } as any;
      },
    }),
  ],
});

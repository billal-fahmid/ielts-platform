import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import { checkRateLimit, resetRateLimit } from "@/lib/security/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
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
        } as any;
      },
    }),
  ],
});

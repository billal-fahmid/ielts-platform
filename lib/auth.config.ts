import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no database access here (used by middleware on the Edge runtime).
// The full config in lib/auth.ts extends this with the Credentials provider.
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  // In production Auth.js refuses requests unless the host is trusted. When the site address is configured (AUTH_URL or
  // NEXTAUTH_URL) the configured address is used instead of the request's Host header, so trusting it is safe.
  trustHost: Boolean(process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.AUTH_TRUST_HOST === "true"),
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};

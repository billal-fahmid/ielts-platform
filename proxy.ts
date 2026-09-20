import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { isSameOriginRequest, MUTATING_METHODS } from "@/lib/security/origin";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // CSRF: state-changing API calls must come from this site. (Auth has its own CSRF token; webhooks
  // and file uploads are excluded from this proxy and verify themselves.)
  if (pathname.startsWith("/api/")) {
    if (MUTATING_METHODS.has(req.method) && !isSameOriginRequest(req)) {
      return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
    }
    return NextResponse.next();
  }

  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role;

  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");
  const isAdmin = pathname.startsWith("/admin");
  const isTeacher = pathname.startsWith("/teacher");

  if ((isDashboard || isAdmin || isTeacher) && !isLoggedIn) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdmin && role !== "ADMIN" && role !== "TEACHER") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
  if (isTeacher && role !== "ADMIN" && role !== "TEACHER") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/teacher/:path*",
    "/onboarding/:path*",
    // Every API route except auth (own CSRF), webhooks (signature-verified) and uploads (large bodies; checked in the route).
    "/api/((?!auth|webhooks|uploads).*)",
  ],
};

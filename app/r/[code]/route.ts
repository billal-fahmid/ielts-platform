import { NextResponse } from "next/server";
import { clientIp } from "@/lib/security/rate-limit";
import { ownerOfCode, recordClick, visitorFingerprint } from "@/lib/services/referrals";
import { REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS } from "@/lib/growth/rules";

/**
 * A friend's referral link: /r/ABCD2345. It counts the click (once per visitor per day), remembers the code for
 * 30 days in a cookie, and sends the visitor to the sign-up page. Unknown codes just go to sign-up.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL("/register", process.env.APP_URL || process.env.AUTH_URL || req.url);
  const res = NextResponse.redirect(url);
  const owner = ownerOfCode(code);
  if (!owner) return res;

  const day = new Date().toISOString().slice(0, 10);
  recordClick(owner.code, visitorFingerprint(clientIp(req), req.headers.get("user-agent") ?? "", owner.code, day));
  res.cookies.set(REFERRAL_COOKIE, owner.code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: REFERRAL_COOKIE_DAYS * 86_400 });
  return res;
}

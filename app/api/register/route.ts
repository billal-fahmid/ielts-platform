import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations";
import { createUser } from "@/lib/services/users";
import { readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { logError } from "@/lib/security/error-log";
import { notify } from "@/lib/services/notifications";
import { recordRegistration } from "@/lib/services/referrals";
import { REFERRAL_COOKIE } from "@/lib/growth/rules";

export async function POST(req: Request) {
  const limited = rateLimit(req, { name: "register", limit: 10, windowSeconds: 3600 });
  if (limited) return limited;

  const body = await readJson(req, registerSchema, 10_000);
  if (!body.ok) return body.response;

  try {
    const userId = await createUser(body.data.name, body.data.email, body.data.password);
    notify(userId, { type: "SYSTEM", title: "Welcome to BanglaEnglish!", body: "Take the placement test to find your level, then start your first lesson.", url: "/dashboard/assessment", email: true });
    // If they arrived through a friend's referral link, link the new account to that friend.
    const cookie = (req.headers.get("cookie") ?? "").split(/;s*/).find((c) => c.startsWith(REFERRAL_COOKIE + "="));
    try {
      recordRegistration(cookie ? decodeURIComponent(cookie.slice(REFERRAL_COOKIE.length + 1)) : null, userId);
    } catch (e) {
      logError("api:/api/register:referral", e, { method: "POST", userId });
    }
    const res = NextResponse.json({ userId });
    res.cookies.delete(REFERRAL_COOKIE);
    return res;
  } catch (e: any) {
    // "Email already registered" is safe to show; anything else is logged and hidden.
    if (/already/i.test(e?.message ?? "")) return NextResponse.json({ error: e.message }, { status: 400 });
    logError("api:/api/register", e, { method: "POST" });
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }
}

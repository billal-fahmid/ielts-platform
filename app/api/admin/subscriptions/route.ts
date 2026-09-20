import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireRole } from "@/lib/security/guards";
import { readJson } from "@/lib/security/http";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";
import { grantSubscription, getPlanByCode } from "@/lib/services/plans";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter the student's email address."),
  planCode: z.string().trim().min(1),
  days: z.number().int().min(1, "Enter at least 1 day.").max(3650, "That is too long (10 years at most)."),
});

/** An administrator gives a student a plan for a number of days (for scholarships, support fixes and manual payments). */
export async function POST(req: Request) {
  const g = await requireRole("ADMIN");
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "admin-write", limit: 120, windowSeconds: 60, key: g.user.id });
  if (limited) return limited;

  const body = await readJson(req, schema);
  if (!body.ok) return body.response;
  const { email, planCode, days } = body.data;

  const plan = getPlanByCode(planCode);
  if (!plan || plan.rank <= 0) return NextResponse.json({ error: "Choose a paid plan." }, { status: 400 });
  const user = db.select().from(users).where(eq(users.email, email)).get();
  if (!user) return NextResponse.json({ error: "No account uses that email address." }, { status: 404 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "Teachers and admins already have full access." }, { status: 400 });

  const sub = grantSubscription({ userId: user.id, planCode, days, source: "ADMIN" });
  if (!sub) return NextResponse.json({ error: "Couldn't grant that plan." }, { status: 400 });
  audit({ actorId: g.user.id, actorRole: g.user.role, action: "subscription.grant", entityType: "subscriptions", entityId: sub.id, metadata: { userId: user.id, plan: plan.code, days } }, req);
  return NextResponse.json({ id: sub.id, currentPeriodEnd: sub.currentPeriodEnd });
}

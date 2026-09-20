import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { getEntitlements, canAccessCourse, getPlanByCode } from "@/lib/services/plans";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/security/guards";
import { rateLimit } from "@/lib/security/rate-limit";
import { enroll, unenroll } from "@/lib/services/enrollment";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const g = await requireUser();
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "enroll", limit: 30, windowSeconds: 600, key: g.user.id });
  if (limited) return limited;

  const { id } = await params;
  const course = db.select().from(courses).where(eq(courses.id, id)).get();
  if (!course || !course.published) return NextResponse.json({ error: "This course isn't available." }, { status: 404 });
  const ent = getEntitlements(g.user.id);
  if (!canAccessCourse(ent, course)) {
    const required = getPlanByCode(course.requiredPlan);
    return NextResponse.json(
      { error: `${course.title} is included from the ${required?.name ?? course.requiredPlan} plan. You're on ${ent.plan.name}.`, upgrade: true, requiredPlan: required ? { code: required.code, name: required.name } : null },
      { status: 402 }
    );
  }
  const result = enroll(g.user.id, id);
  if (!result) return NextResponse.json({ error: "This course isn't available." }, { status: 404 });
  return NextResponse.json({ enrolled: true, created: result.created });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await requireUser();
  if (!g.ok) return g.response;
  const { id } = await params;
  const left = unenroll(g.user.id, id);
  return NextResponse.json({ enrolled: false, left });
}

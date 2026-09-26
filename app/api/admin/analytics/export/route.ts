import { NextResponse } from "next/server";
import { requireRole } from "@/lib/security/guards";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";
import { adminAnalytics } from "@/lib/services/analytics";
import { parseRange, shortDay, toCsv } from "@/lib/analytics/rules";

const SERIES = ["users", "revenue", "enrollments", "activity", "teachers"] as const;

/**
 * Downloads one chart's numbers as a CSV file for spreadsheets. Administrators only. Values that a spreadsheet could
 * run as a formula (a name starting with "=" for example) are neutralised.
 */
export async function GET(req: Request) {
  const g = await requireRole("ADMIN");
  if (!g.ok) return g.response;
  const limited = rateLimit(req, { name: "analytics-export", limit: 30, windowSeconds: 60, key: g.user.id });
  if (limited) return limited;

  const url = new URL(req.url);
  const series = url.searchParams.get("series") ?? "";
  if (!(SERIES as readonly string[]).includes(series)) return NextResponse.json({ error: "Unknown series." }, { status: 400 });
  const range = parseRange(url.searchParams.get("range"));
  const byMonth = url.searchParams.get("by") === "month";
  const a = adminAnalytics({ range });

  let csv: string;
  if (series === "teachers") {
    csv = toCsv(["Teacher", "Email", "Courses", "Students", "Classes", "Assignments graded", "Writing reviews", "1-on-1 sessions"], a.teachers.map((t) => [t.name, t.email, t.courses, t.students, t.classes, t.assignmentsGraded, t.writingReviews, t.speakingSessions]));
  } else if (byMonth) {
    const rows = a.monthly;
    if (series === "users") csv = toCsv(["Month", "New students", "Active students"], rows.map((r) => [r.month, r.newUsers, r.activeUsers]));
    else if (series === "revenue") csv = toCsv(["Month", "Net revenue (BDT)"], rows.map((r) => [r.month, r.revenue]));
    else if (series === "enrollments") csv = toCsv(["Month", "New enrolments"], rows.map((r) => [r.month, r.enrollments]));
    else return NextResponse.json({ error: "Activity is only available by day." }, { status: 400 });
  } else {
    const rows = a.daily;
    if (series === "users") csv = toCsv(["Day", "New students", "Active students"], rows.map((r) => [r.day, r.newUsers, r.activeUsers]));
    else if (series === "revenue") csv = toCsv(["Day", "Net revenue (BDT)"], rows.map((r) => [r.day, r.revenue]));
    else if (series === "enrollments") csv = toCsv(["Day", "New enrolments"], rows.map((r) => [r.day, r.enrollments]));
    else csv = toCsv(["Day", "Lessons", "Quizzes", "IELTS practice", "Essays", "Speaking", "Mock tests", "AI tutor messages"], rows.map((r) => [r.day, r.lesson, r.quiz, r.practice, r.writing, r.speaking, r.mock, r.ai]));
  }

  audit({ actorId: g.user.id, actorRole: g.user.role, action: "analytics.export", entityType: "analytics", metadata: { series, range, by: byMonth ? "month" : "day" } }, req);
  const name = `banglaenglish-${series}-${byMonth ? "monthly" : `${range}d`}-${shortDay(new Date().toISOString().slice(0, 10)).replace(" ", "-")}.csv`;
  return new NextResponse("﻿" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

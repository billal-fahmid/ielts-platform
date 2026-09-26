import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Download } from "lucide-react";
import { requirePageRole } from "@/lib/security/guards";
import { adminAnalytics } from "@/lib/services/analytics";
import { parseRange, RANGES } from "@/lib/analytics/rules";
import { formatTaka } from "@/lib/plans/features";
import { Card } from "@/components/ui/card";
import { RankBars, TrendBars, TrendLines } from "@/components/admin/analytics-charts";
import { SERIES } from "@/lib/analytics/series";
import { cn } from "@/lib/utils";

export const metadata = { title: "Analytics — Admin" };

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-ink-soft">No earlier data</span>;
  const up = value >= 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-success" : "text-danger")} data-testid="change">
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {up ? "+" : ""}
      {value}%
    </span>
  );
}

function MetricCard({ label, value, change, hint, id }: { label: string; value: string | number; change?: number | null; hint?: string; id: string }) {
  return (
    <Card className="p-4" data-testid={`metric-${id}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink" data-testid="value">
        {value}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
        {change !== undefined && <Change value={change} />}
        {hint && <span>{hint}</span>}
      </div>
    </Card>
  );
}

function ChartCard({ title, subtitle, exportHref, children }: { title: string; subtitle?: string; exportHref?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-ink-soft">{subtitle}</p>}
        </div>
        {exportHref && (
          <a href={exportHref} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-soft hover:text-ink" download>
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requirePageRole(["ADMIN"], "/admin");
  const { range: rawRange } = await searchParams;
  const range = parseRange(rawRange);
  const a = adminAnalytics({ range });
  const m = a.metrics;
  const exp = (series: string, by = "day") => `/api/admin/analytics/export?series=${series}&range=${range}&by=${by}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Analytics</h1>
          <p className="mt-1 text-sm text-ink-soft">The last {range} days compared with the {range} days before. Times are Bangladesh time; figures refresh every minute.</p>
        </div>
        <div className="flex gap-2" aria-label="Period" data-testid="ranges">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin/analytics?range=${r}`} className={cn("rounded-full border px-3 py-1 text-xs font-medium", r === range ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-soft hover:text-ink")}>
              {r} days
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4" data-testid="metrics">
        <MetricCard id="totalUsers" label="Total users" value={m.totalUsers.value} hint={`${m.totalUsers.students} students · ${m.totalUsers.teachers} teachers · ${m.totalUsers.admins} admins`} />
        <MetricCard id="activeUsers" label="Active students" value={m.activeUsers.value} change={m.activeUsers.change} hint="studied in the period" />
        <MetricCard id="newUsers" label="New students" value={m.newUsers.value} change={m.newUsers.change} />
        <MetricCard id="premiumUsers" label="Premium students" value={m.premiumUsers.value} hint="on a paid plan now" />
        <MetricCard id="enrollments" label="Course enrolments" value={m.enrollments.value} change={m.enrollments.change} hint={`${m.enrollments.total} in total`} />
        <MetricCard id="revenue" label="Revenue (net)" value={formatTaka(m.revenue.value)} change={m.revenue.change} hint={m.revenue.refunds ? `${formatTaka(m.revenue.gross)} paid, ${formatTaka(m.revenue.refunds)} refunded` : `${formatTaka(m.revenue.gross)} paid`} />
        <MetricCard id="mockTests" label="Mock tests taken" value={m.mockTests.value} change={m.mockTests.change} />
        <MetricCard id="aiSessions" label="AI sessions" value={m.aiSessions.value} change={m.aiSessions.change} hint="tutor chats and AI feedback" />
        <MetricCard id="writingSubmissions" label="Writing submissions" value={m.writingSubmissions.value} change={m.writingSubmissions.change} />
        <MetricCard id="speakingSessions" label="Speaking sessions" value={m.speakingSessions.value} change={m.speakingSessions.change} hint="AI practice" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Daily users" subtitle="New sign-ups and students who studied that day" exportHref={exp("users")}>
          <TrendLines data={a.daily} xKey="day" series={SERIES.users} label="Daily new and active students" />
        </ChartCard>
        <ChartCard title="Monthly users" subtitle="Last 12 months" exportHref={exp("users", "month")}>
          <TrendBars data={a.monthly} xKey="month" series={SERIES.users} label="Monthly new and active students" />
        </ChartCard>
        <ChartCard title="Revenue, by day" subtitle="Payments confirmed, minus refunds made that day" exportHref={exp("revenue")}>
          <TrendBars data={a.daily} xKey="day" series={SERIES.revenue} label="Daily net revenue in taka" currency />
        </ChartCard>
        <ChartCard title="Revenue, by month" subtitle="Last 12 months" exportHref={exp("revenue", "month")}>
          <TrendBars data={a.monthly} xKey="month" series={SERIES.revenue} label="Monthly net revenue in taka" currency />
        </ChartCard>
        <ChartCard title="Course enrolments" subtitle="New enrolments each day" exportHref={exp("enrollments")}>
          <TrendLines data={a.daily} xKey="day" series={SERIES.enrollments} label="Daily new course enrolments" />
        </ChartCard>
        <ChartCard title="Most popular courses" subtitle={`New enrolments in the last ${range} days`}>
          <RankBars data={a.topCourses} label="Courses with the most new enrolments" />
        </ChartCard>
      </div>

      <ChartCard title="Learning activity" subtitle="What students did each day" exportHref={exp("activity")}>
        <TrendBars data={a.daily} xKey="day" series={SERIES.activity} label="Daily learning activity by type" stacked />
      </ChartCard>

      <Card className="overflow-x-auto p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-5">
          <div>
            <h2 className="font-display text-lg text-ink">Teacher activity</h2>
            <p className="text-xs text-ink-soft">Work done in the last {range} days</p>
          </div>
          <a href={exp("teachers")} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-soft hover:text-ink" download>
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
        </div>
        {a.teachers.length === 0 ? (
          <p className="p-5 text-sm text-ink-soft">There are no teachers yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm" data-testid="teacher-table">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-5 py-3 font-medium">Teacher</th>
                <th className="px-4 py-3 font-medium">Courses</th>
                <th className="px-4 py-3 font-medium">Students</th>
                <th className="px-4 py-3 font-medium">Classes</th>
                <th className="px-4 py-3 font-medium">Graded</th>
                <th className="px-4 py-3 font-medium">Writing reviews</th>
                <th className="px-4 py-3 font-medium">1-on-1 sessions</th>
              </tr>
            </thead>
            <tbody>
              {a.teachers.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-medium text-ink">{t.name}</p>
                    <p className="text-xs text-ink-soft">{t.email}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{t.courses}</td>
                  <td className="px-4 py-3 text-ink-soft">{t.students}</td>
                  <td className="px-4 py-3 text-ink-soft">{t.classes}</td>
                  <td className="px-4 py-3 text-ink-soft">{t.assignmentsGraded}</td>
                  <td className="px-4 py-3 text-ink-soft">{t.writingReviews}</td>
                  <td className="px-4 py-3 text-ink-soft">{t.speakingSessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

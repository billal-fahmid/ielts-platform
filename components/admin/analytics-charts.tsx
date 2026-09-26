"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { shortDay, shortMonth } from "@/lib/analytics/rules";
import { formatTaka } from "@/lib/plans/features";
import type { Series } from "@/lib/analytics/series";

/**
 * Chart colours come from the site theme, so they follow light and dark mode. Every chart also has its numbers in a
 * table underneath ("View as a table"), so nothing depends on being able to tell colours apart.
 */
const C = {
  primary: "var(--color-primary)",
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  dark: "var(--color-primary-dark)",
  soft: "var(--color-ink-soft)",
  accentDark: "var(--color-accent-dark)",
};

const axis = { fontSize: 11, fill: "var(--color-ink-soft)" };
const tooltip = { contentStyle: { background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 } };

function DataTable({ rows, columns, format }: { rows: Record<string, any>[]; columns: { key: string; label: string }[]; format?: (key: string, v: any) => string }) {
  return (
    <details className="mt-3 text-xs text-ink-soft">
      <summary className="cursor-pointer">View as a table</summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-border">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-surface">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-1.5 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {columns.map((c) => (
                  <td key={c.key} className="px-2 py-1">
                    {format ? format(c.key, r[c.key]) : String(r[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Empty() {
  return <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border text-sm text-ink-soft">Nothing to show for this period yet.</div>;
}

const hasData = (rows: Record<string, any>[], keys: string[]) => rows.some((r) => keys.some((k) => Number(r[k]) !== 0));

/** A line chart over days or months. */
export function TrendLines({ data, xKey, series, label, currency = false }: { data: Record<string, any>[]; xKey: "day" | "month"; series: Series[]; label: string; currency?: boolean }) {
  const fmt = (v: any) => (currency ? formatTaka(Number(v)) : String(v));
  const tick = (v: string) => (xKey === "day" ? shortDay(v) : shortMonth(v));
  if (!hasData(data, series.map((s) => s.key))) return <Empty />;
  return (
    <div role="img" aria-label={label}>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={tick} tick={axis} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} width={44} tickFormatter={(v) => (currency ? String(v) : String(v))} />
            <Tooltip {...tooltip} labelFormatter={(v) => tick(String(v))} formatter={(v, name) => [fmt(v), name]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {series.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <DataTable rows={data} columns={[{ key: xKey, label: xKey === "day" ? "Day" : "Month" }, ...series.map((s) => ({ key: s.key, label: s.label }))]} format={(k, v) => (k === xKey ? tick(v) : fmt(v))} />
    </div>
  );
}

/** A bar chart over days or months, stacked or side by side. */
export function TrendBars({ data, xKey, series, label, stacked = false, currency = false }: { data: Record<string, any>[]; xKey: "day" | "month"; series: Series[]; label: string; stacked?: boolean; currency?: boolean }) {
  const fmt = (v: any) => (currency ? formatTaka(Number(v)) : String(v));
  const tick = (v: string) => (xKey === "day" ? shortDay(v) : shortMonth(v));
  if (!hasData(data, series.map((s) => s.key))) return <Empty />;
  return (
    <div role="img" aria-label={label}>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey={xKey} tickFormatter={tick} tick={axis} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={axis} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
            <Tooltip {...tooltip} labelFormatter={(v) => tick(String(v))} formatter={(v, name) => [fmt(v), name]} cursor={{ fill: "var(--color-primary-soft)" }} />
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId={stacked ? "a" : undefined} radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable rows={data} columns={[{ key: xKey, label: xKey === "day" ? "Day" : "Month" }, ...series.map((s) => ({ key: s.key, label: s.label }))]} format={(k, v) => (k === xKey ? tick(v) : fmt(v))} />
    </div>
  );
}

/** Horizontal bars for a ranked list, such as the courses students enrolled in most. */
export function RankBars({ data, label }: { data: { course: string; enrollments: number }[]; label: string }) {
  if (data.length === 0) return <Empty />;
  return (
    <div role="img" aria-label={label}>
      <div style={{ height: Math.max(180, data.length * 36) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
            <XAxis type="number" tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="course" tick={axis} axisLine={false} tickLine={false} width={130} tickFormatter={(v: string) => (v.length > 20 ? v.slice(0, 19) + "…" : v)} />
            <Tooltip {...tooltip} cursor={{ fill: "var(--color-primary-soft)" }} />
            <Bar dataKey="enrollments" name="New enrolments" fill={C.primary} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable rows={data} columns={[{ key: "course", label: "Course" }, { key: "enrollments", label: "New enrolments" }]} />
    </div>
  );
}

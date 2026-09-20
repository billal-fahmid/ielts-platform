import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { desc, eq, like, sql } from "drizzle-orm";
import { requirePageRole } from "@/lib/security/guards";
import { Card } from "@/components/ui/card";
import { Pager, PAGE_SIZE, parsePage } from "@/components/admin/pager";

export const metadata = { title: "Audit log — Admin" };

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ page?: string; action?: string }> }) {
  await requirePageRole(["ADMIN"], "/admin");
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const action = sp.action?.trim().slice(0, 60);
  const where = action ? like(auditLogs.action, `${action.replace(/[%_]/g, "")}%`) : undefined;

  const total = db.select({ n: sql<number>`count(*)` }).from(auditLogs).where(where).get()?.n ?? 0;
  const rows = db
    .select({ log: auditLogs, actorName: users.name })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(where)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Audit log</h1>
      <p className="mt-1 text-sm text-ink-soft">Who changed what. Passwords, tokens and payment secrets are never recorded.</p>

      <form className="mt-4 flex gap-2" role="search">
        <input name="action" defaultValue={action} placeholder="Filter by action, e.g. resource.update" aria-label="Filter by action" className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink" />
        <button className="rounded-full border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-primary-soft">Filter</button>
      </form>

      <Card className="mt-4 overflow-x-auto p-0">
        <table className="w-full text-sm" data-testid="audit-table">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3 font-medium">When (UTC)</th>
              <th className="px-4 py-3 font-medium">Who</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                  Nothing recorded yet.
                </td>
              </tr>
            )}
            {rows.map(({ log, actorName }) => (
              <tr key={log.id} className="border-b border-border align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{log.createdAt}</td>
                <td className="px-4 py-3 text-ink">
                  {actorName ?? "System"} <span className="text-xs text-ink-soft">{log.actorRole}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-ink">{log.action}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-ink-soft">{[log.entityType, log.entityId].filter(Boolean).join(" · ") || "—"}</td>
                <td className="max-w-[280px] truncate px-4 py-3 font-mono text-xs text-ink-soft" title={JSON.stringify(log.metadata)}>
                  {Object.keys(log.metadata ?? {}).length ? JSON.stringify(log.metadata) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Pager basePath="/admin/audit-logs" page={page} total={total} params={{ action }} />
    </div>
  );
}

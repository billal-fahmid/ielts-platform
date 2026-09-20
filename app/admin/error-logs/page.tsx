import { db } from "@/lib/db";
import { errorLogs } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import { requirePageRole } from "@/lib/security/guards";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pager, PAGE_SIZE, parsePage } from "@/components/admin/pager";

export const metadata = { title: "Error log — Admin" };

export default async function ErrorLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePageRole(["ADMIN"], "/admin");
  const page = parsePage((await searchParams).page);

  const total = db.select({ n: sql<number>`count(*)` }).from(errorLogs).get()?.n ?? 0;
  const rows = db
    .select()
    .from(errorLogs)
    .orderBy(desc(errorLogs.createdAt), desc(errorLogs.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Error log</h1>
      <p className="mt-1 text-sm text-ink-soft">Unexpected server errors. Anything that looks like a key or password is masked before it is saved.</p>

      <div className="mt-4 flex flex-col gap-3" data-testid="error-list">
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-ink-soft">No errors recorded. 🎉</Card>}
        {rows.map((e) => (
          <Card key={e.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="danger">{e.source}</Badge>
              {e.method && e.path && (
                <span className="font-mono text-xs text-ink-soft">
                  {e.method} {e.path}
                </span>
              )}
              <span className="ml-auto text-xs text-ink-soft">{e.createdAt} UTC</span>
            </div>
            <p className="mt-2 break-words text-sm text-ink">{e.message}</p>
            {e.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-ink-soft">Stack trace</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-bg p-3 text-[11px] leading-relaxed text-ink-soft">{e.stack}</pre>
              </details>
            )}
          </Card>
        ))}
      </div>
      <Pager basePath="/admin/error-logs" page={page} total={total} />
    </div>
  );
}

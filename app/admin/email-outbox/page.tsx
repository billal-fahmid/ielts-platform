import { db } from "@/lib/db";
import { emailMessages } from "@/lib/db/schema";
import { desc, sql } from "drizzle-orm";
import { requirePageRole } from "@/lib/security/guards";
import { getEmailProvider } from "@/lib/email";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pager, PAGE_SIZE, parsePage } from "@/components/admin/pager";

export const metadata = { title: "Email log — Admin" };

const TONE = { SENT: "success", FAILED: "danger", OUTBOX: "accent" } as const;
const LABEL = { SENT: "Sent", FAILED: "Failed", OUTBOX: "Not sent (no email provider)" } as const;

export default async function EmailLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requirePageRole(["ADMIN"], "/admin");
  const page = parsePage((await searchParams).page);
  const configured = !!getEmailProvider();

  const total = db.select({ n: sql<number>`count(*)` }).from(emailMessages).get()?.n ?? 0;
  const rows = db
    .select()
    .from(emailMessages)
    .orderBy(desc(emailMessages.createdAt), desc(emailMessages.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Email log</h1>
      <p className="mt-1 text-sm text-ink-soft">Every email the platform tries to send.</p>

      <Card className={`mt-4 p-4 text-sm ${configured ? "" : "border-primary/40"}`}>
        {configured ? (
          <p className="text-ink">Email is configured (SMTP). Messages below were sent to the recipient.</p>
        ) : (
          <p className="text-ink">
            No email provider is configured, so emails are <strong>saved here instead of being sent</strong>. Set <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code> and{" "}
            <code>EMAIL_FROM</code> in the environment to send real emails.
          </p>
        )}
      </Card>

      <div className="mt-4 flex flex-col gap-3" data-testid="email-list">
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-ink-soft">No emails yet.</Card>}
        {rows.map((m) => (
          <Card key={m.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TONE[m.status]}>{LABEL[m.status]}</Badge>
              <span className="text-sm font-medium text-ink">{m.subject}</span>
              <span className="ml-auto text-xs text-ink-soft">{m.createdAt} UTC</span>
            </div>
            <p className="mt-1 text-xs text-ink-soft">To: {m.toEmail}</p>
            {m.error && <p className="mt-1 text-xs text-danger">{m.error}</p>}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-ink-soft">Message</summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-bg p-3 text-xs text-ink-soft">{m.bodyText}</pre>
            </details>
          </Card>
        ))}
      </div>
      <Pager basePath="/admin/email-outbox" page={page} total={total} />
    </div>
  );
}

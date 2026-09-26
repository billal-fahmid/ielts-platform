import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requirePageRole } from "@/lib/security/guards";
import { listBans, listHidden, listReports } from "@/lib/services/community";
import { REPORT_REASON_LABELS, type ReportReason } from "@/lib/community/rules";
import { timeAgo } from "@/lib/notifications/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BanButton, ModerationActions } from "@/components/community/moderation-actions";

export const metadata = { title: "Community moderation — Admin" };

export default async function CommunityModerationPage() {
  const user = await requirePageRole(["ADMIN"], "/admin");
  const actor = { id: user.id, role: user.role };
  const reports = listReports(actor);
  const hiddenAll = listHidden(actor);
  // Reported content that is hidden is already in the queue above; show the rest separately.
  const inQueue = new Set(reports.map((r) => r.key));
  const hidden = hiddenAll.filter((h) => !inQueue.has(`${h.targetType}:${h.id}`));
  const bans = listBans(actor);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Community moderation</h1>
        <p className="mt-1 text-sm text-ink-soft">Posts and replies members have reported. Content reported by 3 different people is hidden automatically until you decide.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink">Reports to review ({reports.length})</h2>
        {reports.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No open reports" description="Nothing needs a decision right now." />
        ) : (
          <div className="flex flex-col gap-3" data-testid="report-queue">
            {reports.map((r) => (
              <Card key={r.key} className="p-4" data-testid="report">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                  <Badge tone={r.targetType === "POST" ? "primary" : "neutral"}>{r.targetType === "POST" ? "Post" : "Reply"}</Badge>
                  {r.hidden && <Badge tone="danger">Hidden</Badge>}
                  <span>by {r.authorName}</span>
                  {r.postId && (
                    <Link href={`/dashboard/community/${r.postId}`} className="text-primary underline">
                      Open thread
                    </Link>
                  )}
                </div>
                <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-ink">{r.text ?? "(already removed)"}</p>
                <ul className="mt-3 flex flex-col gap-1 text-xs text-ink-soft">
                  {r.reports.map((x) => (
                    <li key={x.id}>
                      {x.reporter}: {REPORT_REASON_LABELS[x.reason as ReportReason]}
                      {x.details ? ` — “${x.details}”` : ""} · {timeAgo(x.createdAt)}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <ModerationActions targetType={r.targetType} targetId={r.targetId} hidden={r.hidden} reported />
                  {r.authorId && <BanButton userId={r.authorId} name={r.authorName} banned={r.banned} />}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {hidden.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-ink">Hidden content ({hidden.length})</h2>
          <div className="flex flex-col gap-3" data-testid="hidden-list">
            {hidden.map((h) => (
              <Card key={h.id} className="p-4">
                <p className="text-xs text-ink-soft">
                  {h.targetType === "POST" ? "Post" : "Reply"} by {h.authorName}
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-ink">{h.text}</p>
                <div className="mt-3">
                  <ModerationActions targetType={h.targetType} targetId={h.id} hidden />
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-ink">Restricted members ({bans.length})</h2>
        {bans.length === 0 ? (
          <p className="text-sm text-ink-soft">Nobody is restricted. Use “Restrict member” on a report to stop someone posting.</p>
        ) : (
          <Card className="divide-y divide-border p-0" data-testid="ban-list">
            {bans.map((b) => (
              <div key={b.userId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-ink">{b.name}</p>
                  <p className="text-xs text-ink-soft">
                    {b.email}
                    {b.reason ? ` · ${b.reason}` : ""}
                  </p>
                </div>
                <BanButton userId={b.userId} name={b.name} banned />
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

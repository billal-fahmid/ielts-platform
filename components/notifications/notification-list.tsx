"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NOTIFICATION_LABELS, NOTIFICATION_TYPES, timeAgo, type NotificationItem, type NotificationType } from "@/lib/notifications/types";

/** The full notification centre: filter by type, load more, mark read. */
export function NotificationList({ initialItems, initialCursor, initialUnread }: { initialItems: NotificationItem[]; initialCursor: string | null; initialUnread: number }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [unread, setUnread] = useState(initialUnread);
  const [type, setType] = useState<NotificationType | "">("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = (nextCursor: string | null, t: NotificationType | "", only: boolean) => {
    const params = new URLSearchParams({ limit: "20" });
    if (nextCursor) params.set("cursor", nextCursor);
    if (t) params.set("type", t);
    if (only) params.set("unread", "1");
    return `/api/notifications?${params}`;
  };

  const load = async (append: boolean, t = type, only = unreadOnly) => {
    setLoading(true);
    setError(null);
    const res = await fetch(query(append ? cursor : null, t, only)).catch(() => null);
    setLoading(false);
    if (!res?.ok) {
      setError("We could not load notifications. Please try again.");
      return;
    }
    const data = await res.json();
    setItems((prev) => (append ? [...prev, ...data.items] : data.items));
    setCursor(data.nextCursor);
    setUnread(data.unread);
  };

  const changeFilter = (t: NotificationType | "", only: boolean) => {
    setType(t);
    setUnreadOnly(only);
    load(false, t, only);
  };

  const markAll = async () => {
    const res = await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }).catch(() => null);
    if (res?.ok) {
      setUnread(0);
      setItems((list) => list.map((n) => ({ ...n, read: true })));
      router.refresh();
    }
  };

  const open = async (n: NotificationItem) => {
    if (!n.read) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [n.id] }) }).catch(() => {});
    }
    if (n.url) router.push(n.url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by type"
            value={type}
            onChange={(e) => changeFilter(e.target.value as NotificationType | "", unreadOnly)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="">All types</option>
            {NOTIFICATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {NOTIFICATION_LABELS[t]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => changeFilter(type, e.target.checked)} className="h-4 w-4 accent-primary" /> Unread only
          </label>
        </div>
        <Button variant="outline" size="sm" onClick={markAll} disabled={unread === 0}>
          <CheckCheck className="h-4 w-4" /> Mark all as read{unread > 0 ? ` (${unread})` : ""}
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {items.length === 0 && !loading ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-ink-soft">{unreadOnly || type ? "Nothing matches those filters." : "No notifications yet. We'll tell you here when something happens."}</p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface" data-testid="notification-list">
          {items.map((n) => (
            <li key={n.id} className="border-b border-border last:border-0">
              <button type="button" onClick={() => open(n)} className={cn("flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-primary-soft/40", !n.read && "bg-primary-soft/30")}>
                <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} aria-label={n.read ? "Read" : "Unread"} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{n.title}</span>
                    <Badge tone="neutral">{NOTIFICATION_LABELS[n.type]}</Badge>
                  </span>
                  {n.body && <span className="mt-1 block text-sm text-ink-soft">{n.body}</span>}
                  <span className="mt-1 block text-xs text-ink-soft">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {cursor && (
        <Button variant="outline" onClick={() => load(true)} loading={loading} className="self-center">
          Load more
        </Button>
      )}
    </div>
  );
}

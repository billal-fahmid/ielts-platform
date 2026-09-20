"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo, type NotificationItem } from "@/lib/notifications/types";

const POLL_MS = 60_000;

/** The bell in the top bar. It polls a tiny count endpoint while the tab is visible, and loads the list only when opened. */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [error, setError] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const res = await fetch("/api/notifications/unread-count").catch(() => null);
    if (res?.ok) setUnread((await res.json()).unread);
  }, []);

  useEffect(() => {
    const t = setInterval(refreshCount, POLL_MS);
    document.addEventListener("visibilitychange", refreshCount);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", refreshCount);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setError(false);
    const res = await fetch("/api/notifications?limit=8").catch(() => null);
    if (!res?.ok) {
      setError(true);
      return;
    }
    const data = await res.json();
    setItems(data.items);
    setUnread(data.unread);
  };

  const markAll = async () => {
    const res = await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) }).catch(() => null);
    if (res?.ok) {
      setUnread(0);
      setItems((list) => list?.map((n) => ({ ...n, read: true })) ?? null);
    }
  };

  const openItem = async (n: NotificationItem) => {
    setOpen(false);
    if (!n.read) {
      setUnread((u) => Math.max(0, u - 1));
      fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [n.id] }) }).catch(() => {});
    }
    if (n.url) router.push(n.url);
  };

  return (
    <div className="relative" ref={wrapper}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-soft hover:text-ink"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span data-testid="unread-badge" className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Notifications" className="fixed inset-x-3 top-[4.25rem] z-50 rounded-xl border border-border bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-ink">Notifications</p>
            <button type="button" onClick={markAll} disabled={unread === 0} className="text-xs font-medium text-primary hover:underline disabled:text-ink-soft disabled:no-underline">
              Mark all as read
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {error && <p className="px-4 py-6 text-center text-sm text-danger">We could not load your notifications.</p>}
            {!error && items === null && <p className="px-4 py-6 text-center text-sm text-ink-soft">Loading…</p>}
            {!error && items?.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-soft">You&apos;re all caught up.</p>}
            <ul>
              {items?.map((n) => (
                <li key={n.id}>
                  <button type="button" onClick={() => openItem(n)} className={cn("flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-primary-soft/40", !n.read && "bg-primary-soft/30")}>
                    <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{n.title}</span>
                      {n.body && <span className="mt-0.5 block text-xs text-ink-soft line-clamp-2">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-ink-soft">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="block border-t border-border px-4 py-2.5 text-center text-sm font-medium text-primary hover:underline">
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

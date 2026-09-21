"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Flame, Zap, Moon, Sun, GraduationCap, LogOut, User, TrendingUp, Bell, ShieldCheck, Crown } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useTheme } from "@/components/theme-provider";
import { useState } from "react";
import { gLevelFromXp } from "@/lib/utils";

export function DashboardTopbar({
  profile,
  userName,
  unreadNotifications = 0,
  role = "STUDENT",
}: {
  profile: { xp: number; gLevel: number; streak: number } | undefined;
  userName: string;
  unreadNotifications?: number;
  role?: string;
}) {
  const { theme, toggle } = useTheme();
  const [menu, setMenu] = useState(false);
  const xpInfo = gLevelFromXp(profile?.xp ?? 0);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-bg/90 px-5 backdrop-blur lg:px-6">
      <Link href="/dashboard" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
          <GraduationCap className="h-4.5 w-4.5" />
        </span>
        <span className="hidden sm:inline">
          Bangla<span className="text-primary">English</span>
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink">
          <Zap className="h-3.5 w-3.5 text-accent" /> Lvl {xpInfo.level} · {profile?.xp ?? 0} XP
        </div>
        <div className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink sm:flex">
          <Flame className="h-3.5 w-3.5 text-accent" /> {profile?.streak ?? 0} day streak
        </div>
        <button
          onClick={toggle}
          aria-label="Toggle dark mode"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-soft hover:text-ink"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <NotificationBell initialUnread={unreadNotifications} />
        <div className="relative">
          <button
            onClick={() => setMenu((v) => !v)}
            aria-label="Account menu"
            aria-haspopup="true"
            aria-expanded={menu}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-medium text-white"
          >
            {userName[0]?.toUpperCase()}
          </button>
          {menu && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-lg border border-border bg-surface p-1.5 shadow-lg"
              onMouseLeave={() => setMenu(false)}
            >
              <Link href="/dashboard/profile" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-primary-soft">
                <User className="h-4 w-4" /> Profile
              </Link>
              <Link href="/dashboard/progress" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-primary-soft">
                <TrendingUp className="h-4 w-4" /> Progress
              </Link>
              <Link href="/dashboard/billing" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-primary-soft">
                <Crown className="h-4 w-4" /> My plan
              </Link>
              <Link href="/dashboard/notifications" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-primary-soft">
                <Bell className="h-4 w-4" /> Notifications
              </Link>
              {(role === "ADMIN" || role === "TEACHER") && (
                <Link href={role === "ADMIN" ? "/admin" : "/teacher"} onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-primary-soft">
                  <ShieldCheck className="h-4 w-4" /> {role === "ADMIN" ? "Admin panel" : "Teaching"}
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

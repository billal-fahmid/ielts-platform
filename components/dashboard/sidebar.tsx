"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Layers,
  ClipboardCheck,
  TrendingUp,
  User,
  GraduationCap,
  Globe,
  Target,
  Bot,
  Dumbbell,
  Bell,
  Home,
  Lock,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, mobileNav: true },
  { href: "/dashboard/ielts", label: "IELTS Prep", icon: Target, mobileNav: true },
  { href: "/dashboard/practice", label: "Practice", icon: Dumbbell, mobileNav: false },
  { href: "/dashboard/tutor", label: "AI Tutor", icon: Bot, mobileNav: false },
  { href: "/dashboard/assessment", label: "Assessment", icon: ClipboardCheck, mobileNav: false },
  { href: "/dashboard/courses", label: "Courses", icon: BookOpen, mobileNav: true },
  { href: "/dashboard/grammar", label: "Grammar Lab", icon: Layers, mobileNav: false },
  { href: "/dashboard/vocabulary", label: "Vocabulary", icon: Sparkles, mobileNav: true },
  { href: "/dashboard/flashcards", label: "Flashcards", icon: Sparkles, mobileNav: false },
  { href: "/dashboard/progress", label: "Progress", icon: TrendingUp, mobileNav: true },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell, mobileNav: false },
  { href: "/dashboard/billing", label: "My plan", icon: Crown, mobileNav: false },
  { href: "/dashboard/profile", label: "Profile", icon: User, mobileNav: false },
];

// Bottom navigation on phones and small tablets.
const mobileLinks = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/dashboard/courses", label: "Learn", icon: BookOpen, match: (p: string) => p.startsWith("/dashboard/courses") || p.startsWith("/dashboard/grammar") },
  { href: "/dashboard/ielts", label: "IELTS", icon: Target, match: (p: string) => p.startsWith("/dashboard/ielts") },
  { href: "/dashboard/practice", label: "Practice", icon: Dumbbell, match: (p: string) => ["/dashboard/practice", "/dashboard/tutor", "/dashboard/vocabulary", "/dashboard/flashcards"].some((x) => p.startsWith(x)) },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p === "/dashboard" || ["/dashboard/progress", "/dashboard/profile", "/dashboard/notifications", "/dashboard/assessment"].some((x) => p.startsWith(x)) },
];

export function DashboardSidebar({ lockedPrefixes = [] }: { lockedPrefixes?: string[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
      <div className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col justify-between overflow-y-auto p-4">
        <nav className="flex flex-col gap-1">
          {links.map((l) => {
            const active = l.href === "/dashboard" ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-primary-soft text-primary" : "text-ink-soft hover:bg-primary-soft/60 hover:text-ink"
                )}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
                {lockedPrefixes.some((p) => l.href.startsWith(p)) && <Lock aria-label="Locked on your plan" className="ml-auto h-3.5 w-3.5 text-ink-soft/70" />}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-soft hover:bg-primary-soft/60 hover:text-ink"
        >
          <Globe className="h-4 w-4" /> Back to site
        </Link>
      </div>
    </aside>
  );
}

export function MobileDashboardNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
      {mobileLinks.map((l) => {
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn("flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium", active ? "text-primary" : "text-ink-soft")}
          >
            <l.icon className="h-4.5 w-4.5" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

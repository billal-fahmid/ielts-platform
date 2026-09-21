"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Sparkles,
  HelpCircle,
  FileQuestion,
  Award,
  Users,
  Shapes,
  Target,
  BookOpenCheck,
  Headphones,
  AudioLines,
  PenLine,
  Mic,
  ClipboardCheck,
  ScrollText,
  Bug,
  Mail,
  Megaphone,
  Menu,
  X,
  Crown,
  CreditCard,
  Wallet,
  Ticket,
  Landmark,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; adminOnly?: boolean } | { section: string; adminOnly?: boolean };

const links: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/modules", label: "Modules", icon: Shapes },
  { href: "/admin/lessons", label: "Lessons", icon: Layers },
  { href: "/admin/vocabulary", label: "Vocabulary", icon: Sparkles },
  { href: "/admin/grammarTopics", label: "Grammar Topics", icon: HelpCircle },
  { href: "/admin/quizzes", label: "Quizzes", icon: FileQuestion },
  { href: "/admin/questions", label: "Questions", icon: FileQuestion },
  { href: "/admin/badges", label: "Badges", icon: Award },
  { section: "IELTS" },
  { href: "/admin/ielts-questions", label: "IELTS Questions", icon: Target },
  { href: "/admin/readingPassages", label: "Reading Passages", icon: BookOpenCheck },
  { href: "/admin/listeningTests", label: "Listening Tests", icon: Headphones },
  { href: "/admin/listeningSections", label: "Listening Sections", icon: AudioLines },
  { href: "/admin/writingPrompts", label: "Writing Prompts", icon: PenLine },
  { href: "/admin/speakingPrompts", label: "Speaking Prompts", icon: Mic },
  { href: "/admin/mockTests", label: "Mock Tests", icon: ClipboardCheck },
  { section: "Accounts", adminOnly: true },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
  { section: "Business", adminOnly: true },
  { href: "/admin/plans", label: "Plans and pricing", icon: Crown, adminOnly: true },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard, adminOnly: true },
  { href: "/admin/payments", label: "Payments", icon: Wallet, adminOnly: true },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket, adminOnly: true },
  { href: "/admin/paymentAccounts", label: "Payment accounts", icon: Landmark, adminOnly: true },
  { section: "System", adminOnly: true },
  { href: "/admin/notifications", label: "Announcements", icon: Megaphone, adminOnly: true },
  { href: "/admin/email-outbox", label: "Email log", icon: Mail, adminOnly: true },
  { href: "/admin/audit-logs", label: "Audit log", icon: ScrollText, adminOnly: true },
  { href: "/admin/error-logs", label: "Error log", icon: Bug, adminOnly: true },
];

function visibleLinks(role: string) {
  return links.filter((l) => !l.adminOnly || role === "ADMIN");
}

/** The menu on phones and tablets, where the sidebar is hidden. */
export function AdminMobileMenu({ role }: { role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink">
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      {open && (
        <nav aria-label="Admin" className="fixed inset-x-0 top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-surface p-4 shadow-lg">
          {visibleLinks(role).map((l) =>
            "section" in l ? (
              <p key={l.section} className="mt-3 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70">
                {l.section}
              </p>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium", (l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href)) ? "bg-primary-soft text-primary" : "text-ink-soft")}
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </Link>
            )
          )}
        </nav>
      )}
    </div>
  );
}

export function AdminSidebar({ role = "ADMIN" }: { role?: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
      <nav className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto p-4">
        {visibleLinks(role).map((l) => {
          if ("section" in l) {
            return (
              <p key={l.section} className="mt-3 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70">
                {l.section}
              </p>
            );
          }
          const active = l.href === "/admin" ? pathname === l.href : pathname.startsWith(l.href);
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
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

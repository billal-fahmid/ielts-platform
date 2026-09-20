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
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> } | { section: string };

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
  { section: "Accounts" },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
      <nav className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto p-4">
        {links.map((l) => {
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

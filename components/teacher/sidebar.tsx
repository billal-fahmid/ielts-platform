"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UsersRound, ClipboardList, BarChart3, BookOpen, Shapes, Layers, FileQuestion, HelpCircle, Target, BookOpenCheck, Headphones, AudioLines, PenLine, Mic, ClipboardCheck, Sparkles, MessageSquareText, CalendarClock, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> } | { section: string };

const links: NavItem[] = [
  { href: "/teacher", label: "Overview", icon: LayoutDashboard },
  { href: "/teacher/students", label: "Students", icon: Users },
  { href: "/teacher/batches", label: "Batches", icon: UsersRound },
  { href: "/teacher/assignments", label: "Assignments", icon: ClipboardList },
  { href: "/teacher/reviews", label: "Writing reviews", icon: MessageSquareText },
  { href: "/teacher/sessions", label: "Speaking sessions", icon: CalendarClock },
  { href: "/teacher/analytics", label: "Analytics", icon: BarChart3 },
  { section: "My courses" },
  { href: "/teacher/content/courses", label: "Courses", icon: BookOpen },
  { href: "/teacher/content/modules", label: "Modules", icon: Shapes },
  { href: "/teacher/content/lessons", label: "Lessons", icon: Layers },
  { href: "/teacher/content/quizzes", label: "Quizzes", icon: FileQuestion },
  { href: "/teacher/content/questions", label: "Quiz questions", icon: HelpCircle },
  { section: "IELTS content" },
  { href: "/teacher/ielts-questions", label: "IELTS questions", icon: Target },
  { href: "/teacher/content/readingPassages", label: "Reading passages", icon: BookOpenCheck },
  { href: "/teacher/content/listeningTests", label: "Listening tests", icon: Headphones },
  { href: "/teacher/content/listeningSections", label: "Listening sections", icon: AudioLines },
  { href: "/teacher/content/writingPrompts", label: "Writing prompts", icon: PenLine },
  { href: "/teacher/content/speakingPrompts", label: "Speaking prompts", icon: Mic },
  { href: "/teacher/content/mockTests", label: "Mock tests", icon: ClipboardCheck },
  { section: "Shared library" },
  { href: "/teacher/content/vocabulary", label: "Vocabulary", icon: Sparkles },
  { href: "/teacher/content/grammarTopics", label: "Grammar topics", icon: HelpCircle },
];

const isActive = (pathname: string, href: string) => (href === "/teacher" ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {links.map((l) =>
        "section" in l ? (
          <p key={l.section} className="mt-3 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70">
            {l.section}
          </p>
        ) : (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive(pathname, l.href) ? "bg-primary-soft text-primary" : "text-ink-soft hover:bg-primary-soft/60 hover:text-ink"
            )}
          >
            <l.icon className="h-4 w-4" />
            {l.label}
          </Link>
        )
      )}
    </>
  );
}

/** The menu on phones and tablets, where the sidebar is hidden. */
export function TeacherMobileMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink">
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      {open && (
        <nav aria-label="Teaching" className="fixed inset-x-0 top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-surface p-4 shadow-lg">
          <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
        </nav>
      )}
    </div>
  );
}

export function TeacherSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface lg:block">
      <nav aria-label="Teaching" className="sticky top-16 flex h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto p-4">
        <NavList pathname={pathname} />
      </nav>
    </aside>
  );
}

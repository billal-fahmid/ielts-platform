"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { Menu, X, Moon, Sun, GraduationCap, ChevronDown, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/english-learning", label: "English Learning" },
  { href: "/ielts-preparation", label: "IELTS Prep" },
  { href: "/courses", label: "Courses" },
  { href: "/pricing", label: "Pricing" },
  { href: "/teachers", label: "Teachers" },
  { href: "/blog", label: "Blog" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
            <GraduationCap className="h-4.5 w-4.5" />
          </span>
          Bangla<span className="text-primary">English</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "text-sm font-medium text-ink-soft transition-colors hover:text-ink",
                pathname === l.href && "text-primary"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <button
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-soft hover:text-ink"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {status === "authenticated" ? (
            <div className="relative">
              <button
                onClick={() => setUserMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-border py-1.5 pl-1.5 pr-3 text-sm font-medium text-ink hover:bg-primary-soft"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-white">
                  {session.user?.name?.[0]?.toUpperCase() ?? "U"}
                </span>
                {session.user?.name?.split(" ")[0]}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {userMenu && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-lg border border-border bg-surface p-1.5 shadow-lg"
                  onMouseLeave={() => setUserMenu(false)}
                >
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-primary-soft"
                  >
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                  {((session.user as any)?.role === "ADMIN" || (session.user as any)?.role === "TEACHER") && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink hover:bg-primary-soft"
                    >
                      <ShieldCheck className="h-4 w-4" /> Admin
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
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-ink-soft hover:text-ink">
                Log in
              </Link>
              <LinkButton href="/register" size="sm">
                Start Free
              </LinkButton>
            </>
          )}
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-bg px-5 pb-5 pt-2 lg:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2.5 text-sm font-medium text-ink hover:bg-primary-soft"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
            {status === "authenticated" ? (
              <>
                <LinkButton href="/dashboard" size="sm" className="flex-1">
                  Dashboard
                </LinkButton>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex-1 rounded-full border border-border py-2.5 text-sm text-danger"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="flex-1 rounded-full border border-border py-2.5 text-center text-sm">
                  Log in
                </Link>
                <LinkButton href="/register" size="sm" className="flex-1">
                  Start Free
                </LinkButton>
              </>
            )}
            <button
              onClick={toggle}
              aria-label="Toggle dark mode"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

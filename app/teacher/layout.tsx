import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, GraduationCap } from "lucide-react";
import { requirePageRole } from "@/lib/security/guards";
import { unreadCount } from "@/lib/services/notifications";
import { TeacherMobileMenu, TeacherSidebar } from "@/components/teacher/sidebar";

export const metadata = { title: "Teaching — BanglaEnglish" };

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["TEACHER", "ADMIN"]);
  // Administrators manage the whole platform from the admin console; the teaching area is for teachers' own classes.
  if (user.role === "ADMIN") redirect("/admin");
  const unread = unreadCount(user.id);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-bg/90 px-5 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <TeacherMobileMenu />
          <Link href="/teacher" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
              <GraduationCap className="h-4.5 w-4.5" />
            </span>
            <span className="whitespace-nowrap">
              Teaching<span className="hidden sm:inline"> Console</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink-soft hover:text-ink">
            <Bell className="h-4 w-4" />
            {unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">{unread > 9 ? "9+" : unread}</span>}
          </Link>
          <Link href="/dashboard" className="whitespace-nowrap text-sm font-medium text-ink-soft hover:text-ink">
            Exit<span className="hidden sm:inline"> to dashboard</span>
          </Link>
        </div>
      </header>
      <div className="flex flex-1">
        <TeacherSidebar />
        <main className="min-w-0 flex-1">
          <div className="container-page py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

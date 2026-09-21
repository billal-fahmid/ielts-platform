import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar, AdminMobileMenu } from "@/components/admin/sidebar";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user) redirect("/login");
  if (role !== "ADMIN" && role !== "TEACHER") redirect("/dashboard");
  // Teachers have their own console; the admin console is for administrators.
  if (role === "TEACHER") redirect("/teacher");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-bg/90 px-5 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <AdminMobileMenu role={role} />
          <Link href="/admin" className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
              <GraduationCap className="h-4.5 w-4.5" />
            </span>
            {role === "ADMIN" ? "Admin Console" : "Teaching Console"}
          </Link>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-ink-soft hover:text-ink">
          Exit to dashboard
        </Link>
      </header>
      <div className="flex flex-1">
        <AdminSidebar role={role} />
        <main className="flex-1">
          <div className="container-page py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

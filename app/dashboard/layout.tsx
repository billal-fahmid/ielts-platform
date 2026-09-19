import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfile } from "@/lib/services/users";
import { DashboardSidebar, MobileDashboardNav } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const profile = getProfile(userId);

  if (profile && !profile.onboardingCompleted) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar profile={profile} userName={session.user.name || "Student"} />
      <div className="flex flex-1">
        <DashboardSidebar />
        <main className="flex-1 pb-20 lg:pb-0">
          <div className="container-page py-8">{children}</div>
        </main>
      </div>
      <MobileDashboardNav />
    </div>
  );
}

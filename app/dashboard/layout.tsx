import { getEntitlements } from "@/lib/services/plans";
import { FEATURE_ROUTES } from "@/lib/plans/features";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProfile } from "@/lib/services/users";
import { DashboardSidebar, MobileDashboardNav } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { unreadCount } from "@/lib/services/notifications";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const profile = getProfile(userId);

  if (profile && !profile.onboardingCompleted) {
    redirect("/onboarding");
  }

  const ent = getEntitlements(userId);
  const lockedPrefixes = FEATURE_ROUTES.filter((r) => !ent.features.has(r.feature)).map((r) => r.prefix);

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardTopbar profile={profile} userName={session.user.name || "Student"} unreadNotifications={unreadCount(userId)} role={(session.user as any).role} />
      <div className="flex flex-1">
        <DashboardSidebar lockedPrefixes={lockedPrefixes} />
        <main className="flex-1 pb-20 lg:pb-0">
          <div className="container-page py-8">{children}</div>
        </main>
      </div>
      <MobileDashboardNav />
    </div>
  );
}

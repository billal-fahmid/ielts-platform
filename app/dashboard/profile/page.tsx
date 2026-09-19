import { auth } from "@/lib/auth";
import { getUserWithProfile } from "@/lib/services/users";
import { ProfileForm } from "./profile-form";
import { Card } from "@/components/ui/card";

export default async function ProfilePage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const user = getUserWithProfile(userId);

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-2xl text-ink">Profile</h1>
      <p className="mt-1 text-sm text-ink-soft">Update your details and study preferences.</p>

      <Card className="mt-6 p-6">
        <ProfileForm
          initial={{
            name: user?.name ?? "",
            email: user?.email ?? "",
            phone: user?.profile?.phone ?? "",
            education: user?.profile?.education ?? "",
            countryGoal: user?.profile?.countryGoal ?? "",
            dailyGoalMinutes: user?.profile?.dailyGoalMinutes ?? 20,
          }}
        />
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-display text-lg text-ink">Learning profile</h2>
        <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-ink-soft">English level</dt>
            <dd className="mt-0.5 font-medium text-ink">{user?.profile?.englishLevel ?? "Not assessed"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">IELTS target</dt>
            <dd className="mt-0.5 font-medium text-ink">{user?.profile?.ieltsTarget ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Exam date</dt>
            <dd className="mt-0.5 font-medium text-ink">{user?.profile?.targetExamDate ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Focus skill</dt>
            <dd className="mt-0.5 font-medium text-ink">{user?.profile?.focusSkill ?? "—"}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}

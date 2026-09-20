import { requirePageRole } from "@/lib/security/guards";
import { Card } from "@/components/ui/card";
import { BroadcastForm } from "./broadcast-form";

export const metadata = { title: "Announcements — Admin" };

export default async function AdminNotificationsPage() {
  await requirePageRole(["ADMIN"], "/admin");
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl text-ink">Announcements</h1>
      <p className="mt-1 text-sm text-ink-soft">Send a notification to a group of users. It appears in their notification centre, and can also be emailed.</p>
      <Card className="mt-6 p-6">
        <BroadcastForm />
      </Card>
    </div>
  );
}

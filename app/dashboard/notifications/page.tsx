import { auth } from "@/lib/auth";
import { listNotifications, unreadCount } from "@/lib/services/notifications";
import { getProfile } from "@/lib/services/users";
import { NotificationList } from "@/components/notifications/notification-list";
import { EmailPreference } from "@/components/notifications/email-preference";

export const metadata = { title: "Notifications — BanglaEnglish" };

export default async function NotificationsPage() {
  const session = await auth();
  const userId = (session!.user as any).id;
  const { items, nextCursor } = listNotifications(userId, { limit: 20 });
  const profile = getProfile(userId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Notifications</h1>
        <p className="mt-1 text-sm text-ink-soft">Updates about your courses, feedback, classes, payments and achievements.</p>
      </div>
      <NotificationList initialItems={items} initialCursor={nextCursor} initialUnread={unreadCount(userId)} />
      <EmailPreference initial={profile?.emailNotifications ?? true} />
    </div>
  );
}

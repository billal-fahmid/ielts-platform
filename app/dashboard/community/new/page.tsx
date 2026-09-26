import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isBanned, listCategories } from "@/lib/services/community";
import { Card } from "@/components/ui/card";
import { NewPostForm } from "@/components/community/controls";

export const metadata = { title: "New post — BanglaEnglish" };

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams;
  const session = await auth();
  if (isBanned((session!.user as any).id)) redirect("/dashboard/community");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href="/dashboard/community" className="text-sm text-ink-soft hover:text-ink">
        ← Community
      </Link>
      <h1 className="font-display text-2xl text-ink">New post</h1>
      <Card className="p-5">
        <NewPostForm defaultKind={kind === "QUESTION" ? "QUESTION" : "DISCUSSION"} categories={listCategories({ activeOnly: true }).map((c) => ({ id: c.id, name: c.name }))} />
      </Card>
      <p className="text-xs text-ink-soft">Be kind and write in your own words. Please don&apos;t share personal details such as phone numbers, and don&apos;t advertise. You can report anything that breaks these rules.</p>
    </div>
  );
}

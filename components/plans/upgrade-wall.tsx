import Link from "next/link";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";

/** Shown in place of a locked page. Says what is locked, which plan unlocks it, and where to go next. */
export function UpgradeWall({ title, description, requiredPlanName, currentPlanName }: { title: string; description?: string; requiredPlanName: string; currentPlanName: string }) {
  return (
    <div className="mx-auto max-w-xl py-8" data-testid="upgrade-wall">
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        <p className="text-sm text-ink-soft">
          {description ?? "This is part of a paid plan."} You&apos;re on the <strong className="text-ink">{currentPlanName}</strong> plan; it&apos;s included from <strong className="text-ink">{requiredPlanName}</strong>.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton href="/dashboard/billing">See my plan and upgrade</LinkButton>
          <LinkButton href="/pricing" variant="outline">
            Compare plans
          </LinkButton>
        </div>
        <Link href="/dashboard" className="text-xs text-ink-soft underline hover:text-ink">
          Back to dashboard
        </Link>
      </Card>
    </div>
  );
}

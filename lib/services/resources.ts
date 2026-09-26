import { db } from "@/lib/db";
import { learningResources } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { getEntitlements, listPlans } from "@/lib/services/plans";

export type ResourceItem = {
  id: string;
  title: string;
  description: string;
  kind: "PDF" | "LINK" | "VIDEO" | "AUDIO";
  category: string;
  requiredPlan: string;
  /** Only present when the viewer's plan includes it: the address is never sent to anyone else. */
  url: string | null;
  locked: boolean;
  requiredPlanName: string;
};

/** The plan rank needed to open something ("FREE" is 0), and the viewer's own rank (visitors count as Free). */
function ranks() {
  return new Map(listPlans().map((p) => [p.code, { rank: p.rank, name: p.name }]));
}

/**
 * Published resources for a viewer. Resources their plan doesn't include are listed (so they know what's there) but
 * come without their address. Staff can open everything.
 */
export function listResourcesFor(viewerId: string | null): ResourceItem[] {
  const table = ranks();
  const ent = viewerId ? getEntitlements(viewerId) : null;
  const viewerRank = ent ? (ent.staff ? 99 : ent.plan.rank) : 0;
  return db
    .select()
    .from(learningResources)
    .where(eq(learningResources.published, true))
    .orderBy(asc(learningResources.order), asc(learningResources.title))
    .all()
    .map((r) => {
      const need = table.get(r.requiredPlan) ?? { rank: 0, name: "Free" };
      const locked = need.rank > viewerRank;
      return { id: r.id, title: r.title, description: r.description, kind: r.kind, category: r.category, requiredPlan: r.requiredPlan, url: locked ? null : r.url, locked, requiredPlanName: need.name };
    });
}

export const resourceCategories = (items: { category: string }[]) => [...new Set(items.map((i) => i.category))].sort();

import { NextResponse } from "next/server";
import { requireUser, type SessionUser } from "@/lib/security/guards";
import { getEntitlements, hasFeature, requiredPlanFor, type Entitlements } from "@/lib/services/plans";
import { FEATURE_LABELS, type PlanFeature } from "@/lib/plans/features";

/** 402 Payment Required: the feature exists, but the student's plan doesn't include it. */
export function upgradeResponse(feature: PlanFeature, message?: string) {
  const required = requiredPlanFor(feature);
  return NextResponse.json(
    {
      error: message ?? `${FEATURE_LABELS[feature]} is available on the ${required?.name ?? "paid"} plan and above.`,
      upgrade: true,
      feature,
      requiredPlan: required ? { code: required.code, name: required.name } : null,
    },
    { status: 402 }
  );
}

export type FeatureGuard = { ok: true; user: SessionUser; ent: Entitlements } | { ok: false; response: NextResponse };

/** For API routes: a signed-in student whose plan includes the feature, or the response to return. */
export async function requireFeature(feature: PlanFeature): Promise<FeatureGuard> {
  const g = await requireUser();
  if (!g.ok) return g;
  const ent = getEntitlements(g.user.id);
  if (!hasFeature(ent, feature)) return { ok: false, response: upgradeResponse(feature) };
  return { ok: true, user: g.user, ent };
}

/** For server-rendered pages. */
export function checkFeature(userId: string, feature: PlanFeature) {
  const ent = getEntitlements(userId);
  const required = requiredPlanFor(feature);
  return { allowed: hasFeature(ent, feature), ent, requiredPlanName: required?.name ?? "a paid plan" };
}

/** For routes that already know the user: null if the plan has at least one of the features, else the 402 to return. */
export function denyUnlessFeature(userId: string, ...features: PlanFeature[]): NextResponse | null {
  const ent = getEntitlements(userId);
  return features.some((f) => hasFeature(ent, f)) ? null : upgradeResponse(features[0]);
}

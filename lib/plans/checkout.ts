/** Where the "Upgrade" buttons lead: the checkout page for the plan. */
export function checkoutHref(planCode: string, period: "monthly" | "yearly" = "monthly", courseId?: string) {
  const q = new URLSearchParams({ plan: planCode, period });
  if (courseId) q.set("course", courseId);
  return `/dashboard/checkout?${q}`;
}

/**
 * Where the "Upgrade" buttons lead. Until online payments are switched on this is the contact form,
 * pre-filled with the plan; the payment system replaces this one function.
 */
export function checkoutHref(planCode: string, period: "monthly" | "yearly" = "monthly") {
  return `/contact?plan=${encodeURIComponent(planCode)}&period=${period}`;
}

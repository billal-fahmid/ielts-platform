/** Resources only administrators may touch: teachers must never see accounts, prices or payment details. */
export const ADMIN_ONLY_RESOURCES = new Set(["users", "plans", "coupons", "paymentAccounts"]);

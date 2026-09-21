import type { PaymentStatus } from "./types";

/**
 * The only moves a payment may make. Anything else is refused, so a repeated or forged callback can't
 * bring a failed payment back to life or refund something that was never paid.
 */
const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PROCESSING", "COMPLETED", "FAILED"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: ["REFUNDED"],
  FAILED: [],
  REFUNDED: [],
};

export const canTransition = (from: PaymentStatus, to: PaymentStatus) => TRANSITIONS[from].includes(to);
export const isFinal = (status: PaymentStatus) => TRANSITIONS[status].length === 0;

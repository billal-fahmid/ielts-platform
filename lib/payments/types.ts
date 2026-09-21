/** Payment vocabulary shared by the server and the browser (no database access here). */
export const PAYMENT_METHODS = ["BKASH", "NAGAD", "ROCKET", "BANK_TRANSFER", "CARD", "COUPON"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Debit / credit card",
  COUPON: "Free with coupon",
};

/** Methods a student sends money for by hand and then reports with a transaction ID. */
export const MANUAL_METHODS = ["BKASH", "NAGAD", "ROCKET", "BANK_TRANSFER"] as const;
export type ManualMethod = (typeof MANUAL_METHODS)[number];
export const isManualMethod = (m: string): m is ManualMethod => (MANUAL_METHODS as readonly string[]).includes(m);

export const PAYMENT_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Waiting for your payment",
  PROCESSING: "Being checked",
  COMPLETED: "Paid",
  FAILED: "Not completed",
  REFUNDED: "Refunded",
};

export const STATUS_TONES: Record<PaymentStatus, "neutral" | "accent" | "success" | "danger" | "primary"> = {
  PENDING: "neutral",
  PROCESSING: "accent",
  COMPLETED: "success",
  FAILED: "danger",
  REFUNDED: "primary",
};

export type BillingPeriod = "MONTHLY" | "YEARLY";
export const PERIOD_DAYS: Record<BillingPeriod, number> = { MONTHLY: 30, YEARLY: 365 };

/** What a payment provider tells us happened, in one shape whatever the provider. */
export type PaymentEvent = {
  /** Unique per notification, so a repeat is recognised. */
  eventId: string;
  type: "payment.succeeded" | "payment.failed" | "payment.refunded";
  /** Our transaction id. */
  reference: string;
  amount?: number;
  currency?: string;
  /** The provider's own reference for the payment. */
  providerRef?: string;
};

export type InitiateResult =
  | { kind: "instructions" }
  | { kind: "redirect"; url: string; providerRef?: string };

export type InitiateInput = {
  transactionId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  customer: { name: string; email: string; phone?: string | null };
  productName: string;
  /** Absolute URLs the gateway sends the student back to (they never mark a payment as paid). */
  returnUrl: string;
  /** Absolute URL the gateway calls to tell us the result. */
  notifyUrl: string;
};

/**
 * One way of taking money. `manual` is a person sending money and telling us the transaction ID; a
 * gateway sends the student to a hosted page and later tells us the result by a signed callback.
 */
export interface PaymentProvider {
  readonly code: string;
  readonly displayName: string;
  readonly methods: readonly PaymentMethod[];
  /** False when its credentials are missing: it is then never offered to students. */
  isConfigured(): boolean;
  initiate(input: InitiateInput): Promise<InitiateResult>;
  /**
   * Checks that a callback really came from the provider and turns it into an event. Returns null if
   * it can't be trusted. Nothing is ever marked as paid unless this returns an event.
   */
  verifyWebhook?(rawBody: string, headers: Headers): Promise<PaymentEvent | null>;
}

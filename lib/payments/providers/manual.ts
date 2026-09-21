import { MANUAL_METHODS, type InitiateResult, type PaymentProvider } from "../types";

/**
 * bKash, Nagad, Rocket and bank transfer without a merchant gateway: the student sends the money to an
 * account an admin has set up, then reports the transaction ID, and an admin checks it against the
 * account statement. Nothing here can mark a payment as paid.
 */
export const manualProvider: PaymentProvider = {
  code: "manual",
  displayName: "Send money and report the transaction ID",
  methods: MANUAL_METHODS,
  isConfigured: () => true, // the checkout also needs an active account for the chosen method
  async initiate(): Promise<InitiateResult> {
    return { kind: "instructions" };
  },
};

import type { InitiateResult, PaymentEvent, PaymentProvider } from "../types";
import { parseEventBody, verifySignedRequest } from "../webhook";

/**
 * The platform's own callback contract. Any gateway, or a small bridge in front of one (for example a
 * bKash or Nagad merchant callback), can tell us about a payment by sending a JSON event signed with
 * PAYMENT_WEBHOOK_SECRET. It can't start a payment, so students are never offered it.
 *
 *   POST /api/webhooks/payments/signed
 *   x-timestamp: <unix seconds>
 *   x-signature: hex( HMAC-SHA256( secret, "<timestamp>.<raw body>" ) )
 *   {"eventId":"...","type":"payment.succeeded","reference":"<transaction id>","amount":299,"currency":"BDT"}
 */
export const signedWebhookProvider: PaymentProvider = {
  code: "signed",
  displayName: "Signed callback",
  methods: [],
  isConfigured: () => !!process.env.PAYMENT_WEBHOOK_SECRET && process.env.PAYMENT_WEBHOOK_SECRET.length >= 16,
  async initiate(): Promise<InitiateResult> {
    throw new Error("The signed callback provider can't start payments.");
  },
  async verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent | null> {
    const check = verifySignedRequest(process.env.PAYMENT_WEBHOOK_SECRET, rawBody, headers);
    if (!check.ok) return null;
    return parseEventBody(rawBody);
  },
};

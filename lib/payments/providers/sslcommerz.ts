import type { InitiateInput, InitiateResult, PaymentEvent, PaymentProvider } from "../types";

/**
 * Debit and credit cards (and the wallets SSLCommerz hosts) through SSLCommerz.
 *
 * Needs SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD (SSLCOMMERZ_SANDBOX=false for live). Without
 * them it is not offered. Written from SSLCommerz's public API description and unit-tested with a
 * stand-in server; before going live, run a sandbox payment end to end.
 *
 * Safety rules: the return URLs only send the student back to the payment page. A payment is completed
 * only after SSLCommerz's validation API confirms it for the same transaction, amount and currency.
 */
type Fetch = typeof fetch;

const SUCCESS_STATUSES = new Set(["VALID", "VALIDATED"]);

function base() {
  return process.env.SSLCOMMERZ_SANDBOX === "false" ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";
}

export function createSslCommerzProvider(fetchImpl: Fetch = fetch): PaymentProvider {
  const credentials = () => ({ id: process.env.SSLCOMMERZ_STORE_ID ?? "", password: process.env.SSLCOMMERZ_STORE_PASSWORD ?? "" });

  return {
    code: "sslcommerz",
    displayName: "Card payment (SSLCommerz)",
    methods: ["CARD"],
    isConfigured: () => !!credentials().id && !!credentials().password,

    async initiate(input: InitiateInput): Promise<InitiateResult> {
      const { id, password } = credentials();
      const form = new URLSearchParams({
        store_id: id,
        store_passwd: password,
        total_amount: input.amount.toFixed(2),
        currency: input.currency,
        tran_id: input.transactionId,
        success_url: input.returnUrl,
        fail_url: input.returnUrl,
        cancel_url: input.returnUrl,
        ipn_url: input.notifyUrl,
        cus_name: input.customer.name,
        cus_email: input.customer.email,
        cus_add1: "Bangladesh",
        cus_city: "Dhaka",
        cus_country: "Bangladesh",
        cus_phone: input.customer.phone || "01700000000",
        shipping_method: "NO",
        product_name: input.productName,
        product_category: "Education",
        product_profile: "non-physical-goods",
      });
      const res = await fetchImpl(`${base()}/gwprocess/v4/api.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`SSLCommerz refused the payment request (HTTP ${res.status}).`);
      const data: any = await res.json().catch(() => null);
      if (!data || data.status !== "SUCCESS" || typeof data.GatewayPageURL !== "string" || !/^https:\/\//.test(data.GatewayPageURL)) {
        throw new Error("SSLCommerz did not return a payment page.");
      }
      return { kind: "redirect", url: data.GatewayPageURL, providerRef: typeof data.sessionkey === "string" ? data.sessionkey : undefined };
    },

    /** The IPN body is not trusted by itself: we ask SSLCommerz to confirm the val_id. */
    async verifyWebhook(rawBody: string): Promise<PaymentEvent | null> {
      const { id, password } = credentials();
      if (!id || !password) return null;
      const posted = new URLSearchParams(rawBody);
      const valId = posted.get("val_id");
      const tranId = posted.get("tran_id");
      if (!valId || !tranId || valId.length > 100) return null;

      const url = `${base()}/validator/api/validationserverAPI.php?${new URLSearchParams({ val_id: valId, store_id: id, store_passwd: password, format: "json" })}`;
      let data: any;
      try {
        const res = await fetchImpl(url, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) return null;
        data = await res.json();
      } catch {
        return null;
      }
      if (!data || !SUCCESS_STATUSES.has(String(data.status)) || String(data.tran_id) !== tranId) return null;

      return {
        eventId: valId,
        type: "payment.succeeded",
        reference: tranId,
        amount: Number(data.currency_amount ?? data.amount),
        currency: String(data.currency_type ?? data.currency ?? "").toUpperCase().slice(0, 3),
        providerRef: typeof data.bank_tran_id === "string" ? data.bank_tran_id : undefined,
      };
    },
  };
}

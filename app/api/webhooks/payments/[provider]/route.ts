import { NextResponse } from "next/server";
import { getProvider } from "@/lib/payments/registry";
import { applyPaymentEvent } from "@/lib/services/payments";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";
import { logError } from "@/lib/security/error-log";

const MAX_BODY_BYTES = 100_000;

/**
 * Payment callbacks. This route is outside the site's CSRF check on purpose (gateways are servers, not
 * browsers): instead, every request must be authentic, which the provider proves (a signature, or a
 * confirmation from the gateway's own validation API) before anything is looked at.
 * The reply never says why a callback was refused.
 */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: code } = await params;
  const provider = getProvider(code);
  if (!provider || !provider.verifyWebhook || !provider.isConfigured()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const limited = rateLimit(req, { name: `webhook-${code}`, limit: 600, windowSeconds: 60, key: "all" });
  if (limited) return limited;

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Too large" }, { status: 413 });

  try {
    const event = await provider.verifyWebhook(raw, req.headers);
    if (!event) {
      audit({ action: "payment.webhook_rejected", entityType: "payments", metadata: { provider: code } }, req);
      return NextResponse.json({ error: "Invalid callback" }, { status: 400 });
    }
    const result = applyPaymentEvent(code, event);
    audit({ action: `payment.webhook_${result.outcome.toLowerCase()}`, entityType: "transactions", entityId: result.transactionId, metadata: { provider: code, type: event.type, note: result.note } }, req);
    return NextResponse.json({ received: true, outcome: result.outcome });
  } catch (e) {
    logError(`api:/api/webhooks/payments/${code}`, e, { method: "POST" });
    // A 5xx makes the gateway retry, which is what we want for a temporary fault.
    return NextResponse.json({ error: "Could not process" }, { status: 500 });
  }
}

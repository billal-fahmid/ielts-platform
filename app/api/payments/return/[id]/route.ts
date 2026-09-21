import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/payments/urls";

/**
 * Where a gateway sends the student back to. It only redirects to the payment page: coming back from a
 * gateway proves nothing, so a payment is only completed by the gateway's own verified callback.
 * (Gateways may return by POST, so both methods redirect with 303.)
 */
function back(req: Request, id: string) {
  const safe = /^[0-9a-f-]{8,64}$/i.test(id) ? id : "";
  return NextResponse.redirect(`${appBaseUrl(req)}/dashboard/billing/payments/${safe}`, 303);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return back(req, (await params).id);
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return back(req, (await params).id);
}

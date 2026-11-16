import { json } from "../../../../server/http";
import { handleStripeEvent } from "../../../../server/services/billing/billing.service";
import { verifyWebhookSignature } from "../../../../server/providers/payments/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe's webhook: starts, renews and ends subscriptions, credits top-ups, records refunds. Not signed-in and not same-origin by
 * nature, so the `Stripe-Signature` over the raw body (checked with a five-minute tolerance, so a captured request can't be replayed)
 * is the only gate. Anything unsigned is refused before it is parsed.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  if (!signature || !verifyWebhookSignature(raw, signature)) return json({ error: "Not allowed." }, 401);
  let event: Parameters<typeof handleStripeEvent>[0];
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid body." }, 400);
  }
  try {
    await handleStripeEvent(event);
  } catch {
    console.error("stripe webhook failed"); // a 500 makes Stripe retry
    return json({ error: "Try again." }, 500);
  }
  return json({ data: { ok: true } });
}

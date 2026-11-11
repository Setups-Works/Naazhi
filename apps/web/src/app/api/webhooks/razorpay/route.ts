import { json } from "../../../../server/http";
import { handleWebhook } from "../../../../server/services/billing/billing.service";
import { verifyWebhookSignature } from "../../../../server/providers/payments/razorpay";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Razorpay's webhook: renews, cancels and ends subscriptions. Not signed-in and not same-origin by nature, so the signature over the
 * raw body is the only gate. Anything unsigned is refused before it is parsed.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!signature || !verifyWebhookSignature(raw, signature)) return json({ error: "Not allowed." }, 401);
  const eventId = req.headers.get("x-razorpay-event-id");
  if (!eventId) return json({ error: "Missing event id." }, 400);
  let event: Parameters<typeof handleWebhook>[1];
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid body." }, 400);
  }
  // Razorpay retries for a day, so a signed event older than that is a replay.
  if (typeof event.created_at === "number" && Date.now() / 1000 - event.created_at > 86_400 * 2) return json({ data: { ok: true, stale: true } });
  try {
    await handleWebhook(eventId.slice(0, 100), event);
  } catch {
    console.error("razorpay webhook failed"); // a 500 makes Razorpay retry
    return json({ error: "Try again." }, 500);
  }
  return json({ data: { ok: true } });
}

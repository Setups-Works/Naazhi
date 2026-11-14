import { json } from "../../../../server/http";
import { handleComposioEvent, verifyComposioWebhook } from "../../../../server/services/composio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Composio's webhook: events from connected apps (a new email, a changed calendar event). Not signed-in and not same-origin by nature,
 * so the signature over the raw body is the only gate, and anything unsigned is refused before its body is used. Set this address
 * and COMPOSIO_WEBHOOK_SECRET in the Composio dashboard (see composio/MERGE.md).
 */
export async function POST(req: Request) {
  const event = await verifyComposioWebhook(req);
  if (!event) return json({ error: "Not allowed." }, 401);
  try {
    return json({ data: { ok: true, outcome: await handleComposioEvent(event) } });
  } catch {
    console.error("composio webhook failed"); // a 500 makes Composio send it again
    return json({ error: "Try again." }, 500);
  }
}

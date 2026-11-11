import { z } from "zod";
import { handler } from "../../../../../../server/api/handler";
import { startZohoConnect } from "../../../../../../server/services/integrations/zoho";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const body = z.object({ services: z.array(z.string().max(20)).min(1, "Pick at least one Zoho service.").max(20) });

/** Step 1 of "Connect Zoho": returns the address on Zoho's own page where the person approves access. */
export const POST = handler({ write: true, body }, async ({ userId, body: b }) => ({ url: await startZohoConnect(userId, b.services) }));

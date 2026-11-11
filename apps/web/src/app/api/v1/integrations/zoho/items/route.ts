import { z } from "zod";
import { handler } from "../../../../../../server/api/handler";
import { listZoho } from "../../../../../../server/services/integrations/zoho";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const query = z.object({
  service: z.string().min(1).max(20),
  view: z.string().max(20).optional(),
  q: z.string().max(100).optional(),
});

/** The records a chat card shows, read with the signed-in person's own Zoho connection. The assistant never sees them. */
export const GET = handler({}, async ({ userId, query: sp }) => {
  const p = query.parse({ service: sp.get("service") ?? "", view: sp.get("view") ?? undefined, q: sp.get("q") ?? undefined });
  return listZoho(userId, p.service, p.view, p.q);
});

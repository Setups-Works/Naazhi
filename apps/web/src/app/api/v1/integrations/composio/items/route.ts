import { z } from "zod";
import { handler } from "../../../../../../server/api/handler";
import { listComposioItems } from "../../../../../../server/services/composio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const query = z.object({
  app: z.string().min(1).max(40),
  view: z.string().max(20).optional(),
  q: z.string().max(100).optional(),
});

/** The rows a chat card shows, read with the signed-in person's own connection. The assistant never sees them. */
export const GET = handler({}, async ({ userId, query: sp }) => {
  const p = query.parse({ app: sp.get("app") ?? "", view: sp.get("view") ?? undefined, q: sp.get("q") ?? undefined });
  return listComposioItems(userId, p.app, p.view, p.q);
});

import { z } from "zod";
import { handler } from "../../../../../../server/api/handler";
import { listNotionPages } from "../../../../../../server/services/notion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const query = z.object({ cursor: z.string().max(200).optional(), q: z.string().max(100).optional() });

/** One page of the person's Notion pages, read with their own connection, with which ones were already imported. */
export const GET = handler({}, async ({ userId, query: sp }) => {
  const p = query.parse({ cursor: sp.get("cursor") ?? undefined, q: sp.get("q") ?? undefined });
  return listNotionPages(userId, p.cursor, p.q);
});

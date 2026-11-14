import { z } from "zod";
import { handler } from "../../../../../../server/api/handler";
import { importNotionPages } from "../../../../../../server/services/notion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const body = z.object({ page_ids: z.array(z.string().max(40)).min(1).max(20) });

/** Turns the chosen Notion pages into notes. Pages already imported are skipped. */
export const POST = handler({ write: true, body }, async ({ userId, body: b }) => importNotionPages(userId, b.page_ids));

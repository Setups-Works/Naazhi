import { z } from "zod";
import { handler } from "../../../../../../server/api/handler";
import { saveEventToJournal } from "../../../../../../server/services/composio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const body = z.object({ event_id: z.string().min(1).max(1024) });

/** "Save to journal" on a calendar card: the server reads that event from Google and writes it into the journal on the event's day. */
export const POST = handler({ write: true, body }, async ({ userId, body: b }) => saveEventToJournal(userId, b.event_id));

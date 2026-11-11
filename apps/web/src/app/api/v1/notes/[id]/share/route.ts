import { z } from "zod";
import { handler } from "../../../../../../server/api/handler";
import { setNoteShared } from "../../../../../../server/services/notes/notes.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Turn the public link of one of your notes on or off. Switching it off ends the old link; switching on makes a new one. */
export const POST = handler({ write: true, body: z.object({ shared: z.boolean() }) }, async ({ userId, params, body }) => ({
  share_token: await setNoteShared(userId, params.id, body.shared),
}));

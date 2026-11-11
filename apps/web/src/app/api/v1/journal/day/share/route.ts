import { z } from "zod";
import { handler } from "../../../../../../server/api/handler";
import { getDayShare, setDayShared } from "../../../../../../server/services/journal/journal.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a day.");

/** Whether one of your journal days has a public link, and its token. */
export const GET = handler({}, async ({ userId, query }) => ({
  share_token: await getDayShare(userId, date.parse(query.get("date"))),
}));

/** Turn the public link of a whole journal day on or off. Switching it off ends the old link; switching on makes a new one. */
export const POST = handler({ write: true, body: z.object({ date, shared: z.boolean() }) }, async ({ userId, body }) => ({
  share_token: await setDayShared(userId, body.date, body.shared),
}));

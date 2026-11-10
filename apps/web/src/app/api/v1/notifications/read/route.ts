import { handler } from "../../../../../server/api/handler";
import { markRead } from "../../../../../server/services/notifications/notifications.service";
import { readBody } from "../../../../../server/services/notifications/notifications.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Mark one notification read, or all of them when `id` is null. */
export const POST = handler({ write: true, body: readBody }, async ({ userId, body }) => {
  await markRead(userId, body.id);
  return { ok: true };
});

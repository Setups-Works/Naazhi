import { handler } from "../../../../../server/api/handler";
import { registerDevice } from "../../../../../server/services/notifications/notifications.service";
import { deviceBody } from "../../../../../server/services/notifications/notifications.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The phone tells us its push address so messages can reach it. */
export const POST = handler({ write: true, body: deviceBody, status: 201 }, async ({ userId, body }) => {
  await registerDevice(userId, body.token, body.platform);
  return { ok: true };
});

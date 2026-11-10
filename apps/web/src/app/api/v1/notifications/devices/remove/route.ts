import { handler } from "../../../../../../server/api/handler";
import { unregisterDevice } from "../../../../../../server/services/notifications/notifications.service";
import { deviceRemove } from "../../../../../../server/services/notifications/notifications.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Signing out (or turning notifications off) forgets this phone. A POST because the token is not something to put in a URL. */
export const POST = handler({ write: true, body: deviceRemove }, async ({ userId, body }) => {
  await unregisterDevice(userId, body.token);
  return { ok: true };
});

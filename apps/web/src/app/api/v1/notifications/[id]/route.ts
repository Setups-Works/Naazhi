import { handler } from "../../../../../server/api/handler";
import { removeOne } from "../../../../../server/services/notifications/notifications.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = handler({ write: true }, async ({ userId, params }) => {
  await removeOne(userId, params.id!);
  return { ok: true };
});

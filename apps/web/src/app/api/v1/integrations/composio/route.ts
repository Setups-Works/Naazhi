import { handler } from "../../../../../server/api/handler";
import { composioStatus, disconnectComposio } from "../../../../../server/services/composio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Which Google apps can be connected on this server, and which ones the signed-in person connected. Never returns tokens. */
export const GET = handler({}, async ({ userId }) => composioStatus(userId));

/** Disconnects Google: Google gives up the grant and our record is removed. All Google apps go together, they share one sign-in. */
export const DELETE = handler({ write: true }, async ({ userId }) => {
  await disconnectComposio(userId);
  return composioStatus(userId);
});

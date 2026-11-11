import { handler } from "../../../../../server/api/handler";
import { disconnectZoho, zohoStatus } from "../../../../../server/services/integrations/zoho";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Is Zoho set up on this server, and which account and services has the signed-in person connected? Never returns tokens. */
export const GET = handler({}, async ({ userId }) => zohoStatus(userId));

/** Disconnects Zoho: asks Zoho to cancel the grant and removes the sealed tokens. */
export const DELETE = handler({ write: true }, async ({ userId }) => {
  await disconnectZoho(userId);
  return zohoStatus(userId);
});

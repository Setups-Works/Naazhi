import { handler } from "../../../../../server/api/handler";
import { asComposioApp, composioStatus, disconnectComposio } from "../../../../../server/services/composio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Which apps can be connected on this server, and which ones the signed-in person connected. Never returns tokens or connection ids. */
export const GET = handler({}, async ({ userId }) => composioStatus(userId));

/** Disconnects one app (`?app=gmail`): Composio gives up its tokens and our record is removed. */
export const DELETE = handler({ write: true }, async ({ userId, query }) => {
  await disconnectComposio(userId, asComposioApp(query.get("app")));
  return composioStatus(userId);
});

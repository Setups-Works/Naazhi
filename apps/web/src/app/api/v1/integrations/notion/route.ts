import { handler } from "../../../../../server/api/handler";
import { disconnectNotion, notionStatus } from "../../../../../server/services/notion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Whether Notion can be connected on this server and whether the signed-in person has. Never returns a connection id. */
export const GET = handler({}, async ({ userId }) => notionStatus(userId));

/** Disconnects Notion: Composio gives up its tokens and our record is removed. Notes already imported stay. */
export const DELETE = handler({ write: true }, async ({ userId }) => {
  await disconnectNotion(userId);
  return notionStatus(userId);
});

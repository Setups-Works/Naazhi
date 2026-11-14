import { handler } from "../../../../../../server/api/handler";
import { startComposioConnect } from "../../../../../../server/services/composio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Step 1 of "Connect Google": returns the address of Google's own approval page. One sign-in covers Gmail, Calendar and Drive. */
export const POST = handler({ write: true }, async ({ userId }) => ({ url: await startComposioConnect(userId) }));

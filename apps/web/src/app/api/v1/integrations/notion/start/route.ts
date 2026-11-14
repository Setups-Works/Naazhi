import { handler } from "../../../../../../server/api/handler";
import { startNotionConnect } from "../../../../../../server/services/notion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Step 1 of "Connect Notion": returns the address of Notion's own sign-in page, where the person chooses what to share. */
export const POST = handler({ write: true }, async ({ userId }) => ({ url: await startNotionConnect(userId) }));

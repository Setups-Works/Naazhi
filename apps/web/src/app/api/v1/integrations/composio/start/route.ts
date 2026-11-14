import { z } from "zod";
import { COMPOSIO_APP_IDS } from "@untitled/types";
import { handler } from "../../../../../../server/api/handler";
import { startComposioConnect } from "../../../../../../server/services/composio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const body = z.object({ app: z.enum(COMPOSIO_APP_IDS, "That isn’t an app Naazhi can connect.") });

/** Step 1 of "Connect Gmail": returns the address of the app's own sign-in page, where the person approves access. */
export const POST = handler({ write: true, body }, async ({ userId, body: b }) => ({ url: await startComposioConnect(userId, b.app) }));

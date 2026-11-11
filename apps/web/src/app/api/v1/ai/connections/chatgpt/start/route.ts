import { handler } from "../../../../../../../server/api/handler";
import { startChatgptLogin } from "../../../../../../../server/services/ai/connections.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Starts "Sign in with ChatGPT": answers with the short code to approve and the page to approve it on. */
export const POST = handler({ write: true }, ({ userId }) => startChatgptLogin(userId));

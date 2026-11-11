import { handler } from "../../../../../../../server/api/handler";
import { pollChatgptLogin } from "../../../../../../../server/services/ai/connections.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Has the code been approved yet? "pending" until it is; "connected" once the sign-in is saved. */
export const POST = handler({ write: true }, ({ userId }) => pollChatgptLogin(userId));

import { handler } from "../../../../server/api/handler";
import { listFor } from "../../../../server/services/notifications/notifications.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The signed-in person's inbox (newest first) and how many are unread. */
export const GET = handler({}, ({ userId }) => listFor(userId));

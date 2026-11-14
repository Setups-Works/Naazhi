import { handler } from "../../../../../../server/api/handler";
import { listGoogleCalendarEvents } from "../../../../../../server/services/composio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The person's Google Calendar events, ready to save in their Naazhi calendar. Read with their own token; nothing is stored here. */
export const GET = handler({}, async ({ userId }) => listGoogleCalendarEvents(userId));

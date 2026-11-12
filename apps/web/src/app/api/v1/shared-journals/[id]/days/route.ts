import { handler } from "../../../../../../server/api/handler";
import { listDays } from "../../../../../../server/services/collaboration/collaboration.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The days of a shared journal that have writing, each with its entry count and first words and photo. Members only. */
export const GET = handler({}, ({ userId, params }) => listDays(userId, params.id));

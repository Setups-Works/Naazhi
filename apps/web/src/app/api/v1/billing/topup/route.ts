import { handler } from "../../../../../server/api/handler";
import { startTopup } from "../../../../../server/services/billing/billing.service";
import { topupInput } from "../../../../../server/services/billing/billing.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Starts adding AI credit: answers with what the Razorpay checkout window needs. */
export const POST = handler({ write: true, body: topupInput }, ({ userId, body }) => startTopup(userId, body.amountCents));

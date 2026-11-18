import { handler } from "../../../../../server/api/handler";
import { startCheckout } from "../../../../../server/services/billing/billing.service";
import { checkoutInput } from "../../../../../server/services/billing/billing.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Starts paying for a plan: answers with what Razorpay's window needs, in rupees (India) or US dollars (everyone else). */
export const POST = handler({ write: true, body: checkoutInput }, ({ userId, body }) => startCheckout(userId, body.planId));

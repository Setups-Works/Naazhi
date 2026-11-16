import { handler } from "../../../../../server/api/handler";
import { startCheckout } from "../../../../../server/services/billing/billing.service";
import { checkoutInput } from "../../../../../server/services/billing/billing.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Starts paying for a plan: answers with what Razorpay's window needs (India) or the Stripe page to go to (everyone else). */
export const POST = handler({ write: true, body: checkoutInput }, ({ userId, body }) => startCheckout(userId, body.planId, body.client));

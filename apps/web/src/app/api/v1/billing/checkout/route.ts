import { handler } from "../../../../../server/api/handler";
import { startCheckout } from "../../../../../server/services/billing/billing.service";
import { planIdInput } from "../../../../../server/services/billing/billing.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Starts paying for a plan: answers with what the Razorpay checkout window needs. */
export const POST = handler({ write: true, body: planIdInput }, ({ userId, body }) => startCheckout(userId, body.planId));

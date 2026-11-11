import { handler } from "../../../../../server/api/handler";
import { confirmCheckout } from "../../../../../server/services/billing/billing.service";
import { checkoutConfirmInput } from "../../../../../server/services/billing/billing.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The checkout window finished: verify the signature, ask Razorpay, and activate the plan. */
export const POST = handler({ write: true, body: checkoutConfirmInput }, ({ userId, body }) => confirmCheckout(userId, body));

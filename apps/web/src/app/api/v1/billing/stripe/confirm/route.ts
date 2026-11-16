import { handler } from "../../../../../../server/api/handler";
import { confirmStripe } from "../../../../../../server/services/billing/billing.service";
import { stripeConfirmInput } from "../../../../../../server/services/billing/billing.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Back from Stripe's page: the server asks Stripe what happened (the address is not trusted) and applies a paid plan or top-up. */
export const POST = handler({ write: true, body: stripeConfirmInput }, ({ userId, body }) => confirmStripe(userId, body));

import { handler } from "../../../../../../server/api/handler";
import { confirmTopup } from "../../../../../../server/services/billing/billing.service";
import { topupConfirmInput } from "../../../../../../server/services/billing/billing.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The checkout window finished: verify the signature and add the payment to the balance (once). */
export const POST = handler({ write: true, body: topupConfirmInput }, ({ userId, body }) => confirmTopup(userId, body));

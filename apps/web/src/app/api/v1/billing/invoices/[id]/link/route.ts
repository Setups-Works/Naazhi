import { handler } from "../../../../../../../server/api/handler";
import { invoiceLink } from "../../../../../../../server/services/billing/invoices.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A ten-minute link that opens one invoice in a browser without a sign-in (for the phone app). Only the owner can ask for it. */
export const POST = handler({ write: true }, ({ userId, params }) => invoiceLink(userId, params.id));

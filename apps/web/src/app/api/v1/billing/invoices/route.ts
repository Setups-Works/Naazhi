import { handler } from "../../../../../server/api/handler";
import { listMyInvoices } from "../../../../../server/services/billing/invoices.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The signed-in person's invoices, newest first (billing history). Amounts and numbers only; the printable invoice is the /invoice/<id> page. */
export const GET = handler({}, ({ userId }) => listMyInvoices(userId));

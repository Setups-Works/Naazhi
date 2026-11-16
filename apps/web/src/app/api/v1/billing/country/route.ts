import { handler } from "../../../../../server/api/handler";
import { setCountry } from "../../../../../server/services/billing/billing.service";
import { countryInput } from "../../../../../server/services/billing/billing.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Saves the person's country, which decides their currency and payment provider. Refused while a paid plan or credit would be stranded. */
export const POST = handler({ write: true, body: countryInput }, ({ userId, body }) => setCountry(userId, body.country));

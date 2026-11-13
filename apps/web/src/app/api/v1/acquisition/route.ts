import { cookies } from "next/headers";
import { ACQUISITION_COOKIE } from "@untitled/logic/acquisition";
import { handler } from "../../../../server/api/handler";
import { recordAcquisition } from "../../../../server/services/acquisition/acquisition.service";
import { acquisitionInput } from "../../../../server/services/acquisition/acquisition.schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** First use after sign-up: remember where this person came from (once). */
export const POST = handler({ write: true, body: acquisitionInput }, async ({ userId, body }) =>
  recordAcquisition(userId, body ?? {}, (await cookies()).get(ACQUISITION_COOKIE)?.value),
);

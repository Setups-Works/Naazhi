import { timingSafeEqual } from "node:crypto";
import { json } from "../../../../server/http";
import { serverEnv } from "../../../../config";
import { processPending } from "../../../../server/services/campaigns/campaigns.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function authorised(req: Request) {
  const secret = serverEnv().cronSecret;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

/** Every few minutes: send the next batch of any campaign that is still sending. Called by .github/workflows/cron-notifications.yml with CRON_SECRET. */
export async function POST(req: Request) {
  if (!authorised(req)) return json({ error: "Not allowed." }, 401);
  return json({ data: { sent: await processPending() } });
}

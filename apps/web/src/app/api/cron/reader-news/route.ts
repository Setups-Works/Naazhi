import { timingSafeEqual } from "node:crypto";
import { json } from "../../../../server/http";
import { serverEnv } from "../../../../config";
import { usersForReaderNews } from "../../../../server/repositories/notifications.repository";
import { notifyNewArticles } from "../../../../server/services/rss/rss.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const PEOPLE_PER_RUN = 200;

function authorised(req: Request) {
  const secret = serverEnv().cronSecret;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

/** Hourly: look for new articles for people who have the app and tell them. Called by .github/workflows/cron-notifications.yml with CRON_SECRET. */
export async function POST(req: Request) {
  if (!authorised(req)) return json({ error: "Not allowed." }, 401);
  let told = 0;
  for (const userId of await usersForReaderNews(PEOPLE_PER_RUN)) {
    if (await notifyNewArticles(userId).catch(() => false)) told++;
  }
  return json({ data: { told } });
}

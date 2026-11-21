import { json } from "../../../../server/http";
import { serverEnv } from "../../../../config/env";
import { processMemoryOutbox } from "../../../../server/services/memory/memory-indexing.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = serverEnv().cronSecret;
  if (!secret) return json({ error: "Cron secret not configured." }, 500);

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return json({ error: "Unauthorized." }, 401);
  }

  const result = await processMemoryOutbox(25);
  return json({ ok: true, ...result });
}

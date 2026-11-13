import { json, sameOrigin } from "../../../../server/http";
import { underLimit } from "../../../../server/rateLimit";
import { recordVisit, visitInput } from "../../../../server/services/acquisition/visits.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The website counts a visit by source, once per browser session. Public, same-origin only, rate limited per address (kept in memory for a minute, never stored). */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Not allowed." }, 403);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!(await underLimit(`visit:${ip}`, 20, 60))) return json({ error: "Too many requests." }, 429);
  const parsed = visitInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "That doesn’t look right." }, 400);
  try {
    return json({ data: await recordVisit(parsed.data, req.headers.get("host") ?? "") });
  } catch (e) {
    console.error("visit not counted:", e instanceof Error ? e.message : "unknown error");
    return json({ error: "Something went wrong." }, 500);
  }
}

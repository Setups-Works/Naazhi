import { json, sameOrigin } from "../../../../../server/http";
import { underLimit } from "../../../../../server/rateLimit";
import { collectInput, collectRequest } from "../../../../../server/services/desktopSignIn/desktopSignIn.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The desktop app checks whether its code was approved. Needs the secret it got when it asked, so only that app can collect the token. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Not allowed." }, 403);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!(await underLimit(`desktop-auth-poll:${ip}`, 60, 60))) return json({ error: "Too many requests." }, 429);
  const parsed = collectInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "That doesn’t look right." }, 400);
  try {
    return json({ data: await collectRequest(parsed.data.code, parsed.data.secret) });
  } catch (e) {
    console.error("desktop sign-in check failed:", e instanceof Error ? e.message : "unknown error");
    return json({ error: "Something went wrong." }, 500);
  }
}

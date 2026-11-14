import { json, sameOrigin } from "../../../../server/http";
import { underLimit } from "../../../../server/rateLimit";
import { startRequest } from "../../../../server/services/desktopSignIn/desktopSignIn.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The desktop app asks for a sign-in code. Public (nobody is signed in yet), same-origin only, rate limited per address. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: "Not allowed." }, 403);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!(await underLimit(`desktop-auth:${ip}`, 10, 60))) return json({ error: "Too many requests." }, 429);
  try {
    return json({ data: await startRequest() });
  } catch (e) {
    console.error("desktop sign-in not started:", e instanceof Error ? e.message : "unknown error");
    return json({ error: "Something went wrong." }, 500);
  }
}

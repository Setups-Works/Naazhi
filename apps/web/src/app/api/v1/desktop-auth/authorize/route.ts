import { headers } from "next/headers";
import { auth } from "../../../../../server/auth";
import { forbidden, json, sameOrigin, unauthorized } from "../../../../../server/http";
import { underLimit } from "../../../../../server/rateLimit";
import { currentUser } from "../../../../../server/session";
import { approveRequest, codeInput } from "../../../../../server/services/desktopSignIn/desktopSignIn.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** The signed-in person presses Authorize in their browser: the desktop app's code gets a single-use sign-in token for this account. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!(await underLimit(`desktop-auth-approve:${user.id}`, 10, 60))) return json({ error: "Too many requests." }, 429);
  const parsed = codeInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "That code doesn’t look right." }, 400);
  try {
    const { token } = await auth.api.generateOneTimeToken({ headers: await headers() });
    const ok = await approveRequest(parsed.data.code, user.id, token);
    return ok ? json({ data: { approved: true } }) : json({ error: "That code has expired or was already used." }, 410);
  } catch (e) {
    console.error("desktop sign-in not approved:", e instanceof Error ? e.message : "unknown error");
    return json({ error: "Something went wrong." }, 500);
  }
}

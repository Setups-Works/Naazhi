import { forbidden, json, sameOrigin, unauthorized } from "../../../../../server/http";
import { ServiceError } from "../../../../../server/errors";
import { currentUser } from "../../../../../server/session";
import { desktopLinkInput, sendDesktopLink } from "../../../../../server/services/desktopLink/desktopLink.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** "Get now" for the Mac and Windows apps: emails the signed-in person a download link and answers with the address it went to. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = desktopLinkInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Choose Mac or Windows." }, 400);
  try {
    return json({ data: await sendDesktopLink(user, parsed.data) });
  } catch (e) {
    if (e instanceof ServiceError) return json({ error: e.message }, e.status);
    console.error("desktop link not sent:", e instanceof Error ? e.name : "unknown error");
    return json({ error: "Something went wrong. Try again." }, 500);
  }
}

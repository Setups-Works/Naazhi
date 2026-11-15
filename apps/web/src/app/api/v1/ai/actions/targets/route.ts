import { z } from "zod";
import { forbidden, json, sameOrigin, unauthorized } from "../../../../../../server/http";
import { currentUser } from "../../../../../../server/session";
import { listChatTargets } from "../../../../../../server/services/ai/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const body = z.object({ messageId: z.string().uuid(), which: z.number().int().min(0).max(20) });

/** The person's own items a change or delete draft could mean, so the card can ask which one. Read as the signed-in person. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "That draft is invalid." }, 400);
  try {
    const targets = await listChatTargets(user.id, parsed.data.messageId, parsed.data.which);
    return targets ? json({ targets }) : json({ error: "That draft is no longer available." }, 409);
  } catch {
    return json({ error: "Couldn’t look that up. Please try again." }, 500);
  }
}

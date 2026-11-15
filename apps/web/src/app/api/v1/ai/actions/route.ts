import { z } from "zod";
import { forbidden, json, sameOrigin, unauthorized } from "../../../../../server/http";
import { currentUser } from "../../../../../server/session";
import { ServiceError } from "../../../../../server/errors";
import { createChatItems } from "../../../../../server/services/ai/actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const body = z.object({
  messageId: z.string().uuid(),
  /** Which draft in the message (0-based), or "all" for every draft not created yet. */
  which: z.union([z.number().int().min(0).max(20), z.literal("all")]).default(0),
  /** For a change or delete draft: the item the person picked on the card (one of the targets the server listed for it). */
  targetId: z.string().uuid().optional(),
});

/** Creates items only after the signed-in user confirms the preview shown in chat. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const user = await currentUser();
  if (!user) return unauthorized();
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "That draft is invalid. Ask the assistant to prepare it again." }, 400);
  try {
    const created = await createChatItems(user.id, parsed.data.messageId, parsed.data.which, parsed.data.targetId);
    return created ? json({ created }, 201) : json({ error: "That draft is no longer available." }, 409);
  } catch (e) {
    if (e instanceof ServiceError) return json({ error: e.message }, e.status);
    return json({ error: "Couldn’t do that. Please try again." }, 500);
  }
}

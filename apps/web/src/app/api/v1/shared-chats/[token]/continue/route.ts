import { forbidden, json, sameOrigin, unauthorized } from "../../../../../../server/http";
import { currentUser } from "../../../../../../server/session";
import { continueSharedChat } from "../../../../../../server/services/chats/sharedChat.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** "Continue the conversation": copies the shared chat into the signed-in person's own chats and returns the new chat's id. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(req)) return forbidden();
  const user = await currentUser();
  if (!user) return unauthorized();
  const { token } = await params;
  try {
    const id = await continueSharedChat(user.id, token);
    return id ? json({ data: { id } }) : json({ error: "This chat isn’t shared any more." }, 404);
  } catch {
    return json({ error: "Couldn’t copy this chat. Try again." }, 500);
  }
}

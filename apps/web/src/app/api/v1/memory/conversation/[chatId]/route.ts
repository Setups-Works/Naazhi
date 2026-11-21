import { forbidden, json, sameOrigin, unauthorized } from "../../../../../../server/http";
import { currentUser } from "../../../../../../server/session";
import { deleteUserConversationMemories } from "../../../../../../server/repositories/conversation-memory.repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ chatId: string }> }
) {
  if (!sameOrigin(req)) return forbidden();
  const user = await currentUser();
  if (!user) return unauthorized();

  const { chatId } = await context.params;
  if (!chatId || typeof chatId !== "string") {
    return json({ error: "Valid chatId required." }, 400);
  }

  try {
    await deleteUserConversationMemories(user.id, chatId);
    return json({ ok: true, deleted: true, chatId });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Failed to delete conversation memories" }, 500);
  }
}

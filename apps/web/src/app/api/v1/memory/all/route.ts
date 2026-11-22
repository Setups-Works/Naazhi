import { forbidden, json, sameOrigin, unauthorized } from "../../../../../server/http";
import { currentUser } from "../../../../../server/session";
import { deleteAllUserConversationMemories } from "../../../../../server/repositories/conversation-memory.repository";
import { disableMemory } from "../../../../../server/services/memory/memory-preferences.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const user = await currentUser();
  if (!user) return unauthorized();

  try {
    // Delete every stored memory of this signed-in person
    await deleteAllUserConversationMemories(user.id);
    // Reset preferences back to disabled
    const pref = await disableMemory(user.id);
    return json({ ok: true, cleared: true, preference: pref });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Failed to clear memories" }, 500);
  }
}

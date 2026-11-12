import { json } from "../../../../../server/http";
import { getSharedChat } from "../../../../../server/services/chats/sharedChat.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A shared chat, read-only, for the phone app (the website renders the same chat on /share/<token>). Anyone with the link may read it. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const chat = await getSharedChat(token);
  return chat ? json({ data: chat }) : json({ error: "This chat isn’t shared any more." }, 404);
}

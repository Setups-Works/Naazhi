import "server-only";
import { adminDb, userDb } from "../../session";
import { parseChatAction } from "../../../lib/chat-actions";

/**
 * A chat someone shared by link. The token is the only key (32 hex characters, unguessable), looked up exactly, so nobody can list
 * shared chats. Attachments are left out: their files belong to the owner's folder. Never log titles or messages.
 */
const TOKEN = /^[a-f0-9]{32}$/;

export type SharedMessage = { id: string; role: "user" | "assistant"; body: string; created_at: string };
export type SharedChat = { title: string; shared_at: string; messages: SharedMessage[] };

async function load(token: string) {
  if (!TOKEN.test(token)) return null;
  const sb = adminDb();
  const { data: chat } = await sb.from("chats").select("id,title,shared_at,updated_at").eq("share_token", token).maybeSingle();
  if (!chat) return null;
  const { data } = await sb.from("chat_messages").select("id,role,body,created_at").eq("chat_id", chat.id).order("created_at");
  // The draft blocks an assistant reply carries are not part of what was shared (the public page hides them too).
  const messages = ((data ?? []) as SharedMessage[]).map((m) => ({ ...m, body: m.role === "assistant" ? parseChatAction(m.body).body : m.body }));
  return { chat: { title: chat.title as string, shared_at: (chat.shared_at ?? chat.updated_at) as string }, messages };
}

export async function getSharedChat(token: string): Promise<SharedChat | null> {
  const found = await load(token);
  return found ? { ...found.chat, messages: found.messages } : null;
}

/** Copies a shared chat into the signed-in person's own chats, so they can carry on from there. Returns the new chat's id. */
export async function continueSharedChat(userId: string, token: string): Promise<string | null> {
  const found = await load(token);
  if (!found) return null;
  const db = userDb(userId);
  const made = await db.from("chats").insert({ title: found.chat.title.slice(0, 120) }).select("id").single();
  if (made.error || !made.data) throw new Error("chat");
  const id = made.data.id as string;
  if (found.messages.length) {
    const rows = found.messages.map((m) => ({ chat_id: id, role: m.role, body: m.body, attachments: [], created_at: m.created_at }));
    const { error } = await db.from("chat_messages").insert(rows);
    if (error) {
      await db.from("chats").delete().eq("id", id);
      throw new Error("messages");
    }
  }
  return id;
}

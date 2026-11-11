import "server-only";
import { INBOX_PATH } from "@untitled/logic";
import * as repo from "../../repositories/notifications.repository";
import { NotFoundError } from "../../errors";
import { pushConfigured, sendPush } from "./fcm";

export { pushConfigured };

/** An in-app path the app opens when the notification is tapped. Only paths inside the app are accepted. */
const safeUrl = (url?: string | null) => (url && /^\/(?!\/)[a-z0-9/_?=&.-]*$/i.test(url) ? url : null);

/**
 * Saves the message in each person's inbox, then pushes it to their phones. The inbox copy is what counts: a push that fails (no Firebase
 * set up, phone offline, token gone) never loses the message, and tokens Firebase rejects are forgotten.
 */
export async function notifyUsers(userIds: string[], n: repo.NewNotification): Promise<{ saved: number; pushed: boolean }> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return { saved: 0, pushed: false };
  const url = safeUrl(n.url);
  const saved = await repo.insertFor(ids, { ...n, url });
  if (!pushConfigured()) return { saved, pushed: false };
  try {
    const devices = await repo.tokensFor(ids);
    const dead = await sendPush(
      devices.map((d) => d.token),
      { title: n.title, body: n.body, url },
    );
    await repo.deleteTokens(dead);
    return { saved, pushed: devices.length > 0 };
  } catch (e) {
    console.error("push failed", e instanceof Error ? e.name : "unknown error");
    return { saved, pushed: false };
  }
}

/** Fire-and-forget version for event hooks (an invitation, new articles): it must never fail the action that caused it. */
export const notifyQuietly = (userIds: string[], n: repo.NewNotification) => void notifyUsers(userIds, n).catch(() => undefined);

/** Admin → everyone, or one person by email address. */
export async function sendAdminMessage(input: { title: string; body: string; to?: string }) {
  let ids: string[];
  if (input.to) {
    const id = await repo.userIdByEmail(input.to);
    if (!id) throw new NotFoundError("No one has that email address.");
    ids = [id];
  } else ids = await repo.allUserIds();
  return notifyUsers(ids, { kind: "admin", title: input.title, body: input.body, url: INBOX_PATH });
}

export const listFor = async (userId: string) => ({ items: await repo.list(userId, 50), unread: await repo.unreadCount(userId) });
export const registerDevice = (userId: string, token: string, platform: "android" | "ios") => repo.saveDevice(userId, token, platform);
export const unregisterDevice = (userId: string, token: string) => repo.removeDevice(userId, token);
export const markRead = (userId: string, id: string | null) => repo.markRead(userId, id);
export const removeOne = (userId: string, id: string) => repo.remove(userId, id);
export const sentRecently = repo.recentOfKind;

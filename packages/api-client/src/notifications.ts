import type { Inbox } from "@untitled/types";
import type { Http } from "./sharedJournals";

/* ---------- the inbox ---------- */

const inboxBase = "/api/v1/notifications";

/** The signed-in person's inbox (newest first) and how many are unread. */
export async function fetchInbox(http: Http) {
  return (await http.get<{ data: Inbox }>(inboxBase)).data;
}

/** Mark one notification read, or every one when `id` is null. */
export const markNotificationRead = (http: Http, id: string | null) => http.post(`${inboxBase}/read`, { id });

export const deleteNotification = (http: Http, id: string) => http.delete(`${inboxBase}/${id}`);

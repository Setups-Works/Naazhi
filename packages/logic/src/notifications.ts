import type { AppNotification, Inbox, NotificationKind } from "@untitled/types";

/**
 * The notification inbox, defined once for the web, the Expo app and the server: what a notification is, what each kind is called,
 * how often an open inbox re-reads, and which in-app path a notification opens. Routes: apps/web/src/app/api/v1/notifications.
 */
export type { AppNotification, Inbox, NotificationKind };

/** What each kind is called in the inbox. The icon and tint are each app's own choice. */
export const NOTIFICATION_KINDS: Record<NotificationKind, { label: string }> = {
  admin: { label: "Message from the team" },
  invite: { label: "Shared journal" },
  reader: { label: "Reader" },
};

/** The path of the inbox itself: a notification that points here has nowhere else to go. */
export const INBOX_PATH = "/notifications";

/** There is no realtime for the inbox, so an open one re-reads this often (milliseconds). */
export const INBOX_POLL_MS = 60_000;

/** Where tapping a notification goes, or null when it only points at the inbox (or nowhere). */
export const notificationTarget = (n: Pick<AppNotification, "url">): string | null => (n.url && n.url !== INBOX_PATH ? n.url : null);

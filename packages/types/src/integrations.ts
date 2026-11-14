/**
 * Google apps a person connects with one Google sign-in (Gmail, Google Calendar, Google Drive) and what the API answers about them. Shared by the web app, the
 * Expo app and the API client, so all three agree on the shapes. Each app's details (name, logo, views) are in
 * apps/web/src/lib/composio/apps.ts; the routes are in apps/web/src/app/api/v1/integrations/composio (the name is kept from before Google was connected directly).
 */
export const COMPOSIO_APP_IDS = ["gmail", "googlecalendar", "googledrive"] as const;
export type ComposioAppId = (typeof COMPOSIO_APP_IDS)[number];

/** `connected` works. `pending` is a sign-in that was started but not finished. `expired` and `error` need a reconnect. */
export type ComposioConnectionState = "connected" | "pending" | "expired" | "error";

export type ComposioAppStatus = {
  app: ComposioAppId;
  /** False until Google sign-in is set up on this server (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET). */
  available: boolean;
  /** null when the person has never connected this app. */
  state: ComposioConnectionState | null;
  /** The connected account as the person knows it (an email address). Never a token. */
  account: string | null;
};

export type ComposioStatus = {
  /** False until the Google client is set up on the server. */
  configured: boolean;
  apps: ComposioAppStatus[];
};

/** One line of a chat card: what it is, a second line of detail, and where to open it in the app itself (when known). */
export type ComposioRow = { id: string; title: string; subtitle: string; url: string | null };

export type ComposioItems = { app: ComposioAppId; view: string; title: string; rows: ComposioRow[]; openUrl: string };

/** A Google Calendar event on its way into the Naazhi calendar. All-day: `start`/`end` are `YYYY-MM-DD` (the last day included). Timed: full date-times with their offset. */
export type ImportedGoogleEvent = {
  external_id: string;
  title: string;
  description: string;
  location: string;
  all_day: boolean;
  start: string;
  end: string;
};

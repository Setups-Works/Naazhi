import { COMPOSIO_APP_IDS, type ComposioAppId } from "@untitled/types";
import { PROVIDERS, type ProviderId } from "./catalog";

/**
 * The Google apps Naazhi connects with one Google sign-in, in one list. Pure constants, safe in the browser: no secrets and no SDK (those live in
 * apps/web/src/server/services/composio). To add an app: add its id to COMPOSIO_APP_IDS in @untitled/types and in
 * packages/validation/src/composioActions.ts, add its entry here (with its scopes) and its reader in services/composio/readers.ts.
 * The database needs no migration.
 */
export { COMPOSIO_APP_IDS };
export type { ComposioAppId, ComposioAppStatus, ComposioConnectionState, ComposioItems, ComposioRow, ComposioStatus } from "@untitled/types";

export type ComposioAppDef = {
  name: string;
  /** The Settings page the app is connected from, and its service id on that page (lib/composio/catalog.ts). */
  provider: ProviderId;
  service: string;
  logo: string;
  /** The app's own website, for "Open Gmail". */
  web: string;
  /** The lists a chat card can show; the first is the default. */
  views: readonly [string, ...string[]];
  /** What Google is asked for. Narrowest that does the job: Gmail and Drive are read-only, and Gmail may also send. */
  scopes: readonly string[];
};

/** Asked on every connect, to learn which account signed in. */
export const GOOGLE_IDENTITY_SCOPES = ["openid", "email"] as const;
const SCOPE = "https://www.googleapis.com/auth";

export const COMPOSIO_APPS: Record<ComposioAppId, ComposioAppDef> = {
  gmail: {
    name: "Gmail",
    provider: "google",
    service: "gmail",
    logo: "/logos/gmail.svg",
    web: "https://mail.google.com/",
    views: ["inbox", "unread", "sent"],
    scopes: [`${SCOPE}/gmail.readonly`, `${SCOPE}/gmail.send`],
  },
  googlecalendar: {
    name: "Google Calendar",
    provider: "google",
    service: "calendar",
    logo: "/logos/google-calendar.svg",
    web: "https://calendar.google.com/",
    views: ["upcoming"],
    scopes: [`${SCOPE}/calendar.events`],
  },
  googledrive: {
    name: "Google Drive",
    provider: "google",
    service: "drive",
    logo: "/logos/google-drive.svg",
    web: "https://drive.google.com/",
    views: ["recent"],
    scopes: [`${SCOPE}/drive.readonly`],
  },
};

export const isComposioApp = (s: string | null | undefined): s is ComposioAppId => (COMPOSIO_APP_IDS as readonly string[]).includes(s ?? "");

/** The Composio app behind a service on a Settings page ("google", "calendar" → googlecalendar), if there is one. */
export const composioAppFor = (provider: ProviderId, service: string): ComposioAppId | null =>
  COMPOSIO_APP_IDS.find((id) => COMPOSIO_APPS[id].provider === provider && COMPOSIO_APPS[id].service === service) ?? null;

/** The Settings page where an app is connected and disconnected. */
export const composioSettingsPath = (app: ComposioAppId) => `/dashboard/settings/${COMPOSIO_APPS[app].provider}`;

/** How a message names that page: "Settings → Google". */
export const composioSettingsLabel = (app: ComposioAppId) => `Settings → ${PROVIDERS[COMPOSIO_APPS[app].provider].name}`;

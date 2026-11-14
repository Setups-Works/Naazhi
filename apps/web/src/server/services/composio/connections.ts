import "server-only";
import { COMPOSIO_APP_IDS, type ComposioAppId, type ComposioStatus } from "@untitled/types";
import { isComposioApp } from "../../../lib/composio/apps";
import { ValidationError } from "../../errors";
import { disconnectGoogle, googleConfigured, isConnected, startGoogleConnect } from "./google";

/**
 * Connecting and disconnecting Google. One sign-in connects every Google app at once and one disconnect removes them all; the
 * apps still show separately in Settings so a person sees what Naazhi can use.
 */
export function asComposioApp(app: string | null | undefined): ComposioAppId {
  if (!isComposioApp(app)) throw new ValidationError("That isn’t an app Naazhi can connect.");
  return app;
}

/** Which apps can be connected on this server and which ones the person has connected. Never returns a token. */
export async function composioStatus(userId: string): Promise<ComposioStatus> {
  const row = await isConnected(userId);
  const configured = googleConfigured();
  return {
    configured,
    apps: COMPOSIO_APP_IDS.map((app) => ({ app, available: configured, state: row?.services.includes(app) ? ("connected" as const) : null, account: row?.services.includes(app) ? row.label || null : null })),
  };
}

export const startComposioConnect = (userId: string) => startGoogleConnect(userId);
export const disconnectComposio = (userId: string) => disconnectGoogle(userId);

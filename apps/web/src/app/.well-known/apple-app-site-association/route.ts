import { serverEnv } from "../../../config/env";

export const dynamic = "force-dynamic";

/** Tells iOS which apps may use this domain's passkeys (`webcredentials`) and open shared-chat links (`applinks`). Empty until APPLE_TEAM_ID is set. No file extension, but JSON. */
export function GET() {
  const { appleTeamId } = serverEnv();
  const apps = appleTeamId ? [`${appleTeamId}.com.setupsworks.naazhi`] : [];
  const details = appleTeamId ? [{ appIDs: apps, components: [{ "/": "/share/*", comment: "Shared chats open in the app" }] }] : [];
  return Response.json({ webcredentials: { apps }, applinks: { details } }, { headers: { "cache-control": "public, max-age=3600" } });
}

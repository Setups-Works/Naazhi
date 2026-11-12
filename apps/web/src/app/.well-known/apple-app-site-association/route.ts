import { APP_LINK_PREFIXES } from "@untitled/logic";
import { serverEnv } from "../../../config/env";

export const dynamic = "force-dynamic";

/**
 * Tells iOS which apps may use this domain's passkeys (`webcredentials`) and which links open in the app (`applinks`: shared chats,
 * journal invitations and the dashboard's pages, see APP_LINK_PREFIXES). Empty until APPLE_TEAM_ID is set. No file extension, but JSON.
 */
export function GET() {
  const { appleTeamId } = serverEnv();
  const apps = appleTeamId ? [`${appleTeamId}.com.setupsworks.naazhi`] : [];
  const components = APP_LINK_PREFIXES.flatMap((p) => [{ "/": p }, { "/": `${p}/*` }]);
  const details = appleTeamId ? [{ appIDs: apps, components }] : [];
  return Response.json({ webcredentials: { apps }, applinks: { details } }, { headers: { "cache-control": "public, max-age=3600" } });
}

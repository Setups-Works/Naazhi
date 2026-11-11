import { serverEnv } from "../../../config/env";

export const dynamic = "force-dynamic";

/** Tells iOS which apps may use this domain's passkeys (`webcredentials`). Empty until APPLE_TEAM_ID is set. No file extension, but JSON. */
export function GET() {
  const { appleTeamId } = serverEnv();
  const apps = appleTeamId ? [`${appleTeamId}.com.setupsworks.naazhi`] : [];
  return Response.json({ webcredentials: { apps } }, { headers: { "cache-control": "public, max-age=3600" } });
}

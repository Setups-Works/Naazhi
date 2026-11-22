import { forbidden, json, sameOrigin, unauthorized } from "../../../../../server/http";
import { currentUser } from "../../../../../server/session";
import { getMemoryPreference } from "../../../../../server/services/memory/memory-preferences.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const user = await currentUser();
  if (!user) return unauthorized();

  try {
    const pref = await getMemoryPreference(user.id);
    return json(pref);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Failed to load preferences" }, 500);
  }
}

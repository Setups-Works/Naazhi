import { forbidden, json, sameOrigin, unauthorized } from "../../../../../server/http";
import { ServiceError } from "../../../../../server/errors";
import { currentUser } from "../../../../../server/session";
import { resumeMemory } from "../../../../../server/services/memory/memory-preferences.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return forbidden();
  const user = await currentUser();
  if (!user) return unauthorized();

  try {
    const pref = await resumeMemory(user.id);
    return json({ ok: true, preference: pref });
  } catch (err) {
    if (err instanceof ServiceError) return json({ error: err.message }, err.status);
    return json({ error: err instanceof Error ? err.message : "Failed to resume memory" }, 500);
  }
}

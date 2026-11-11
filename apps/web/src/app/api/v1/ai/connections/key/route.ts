import { z } from "zod";
import { handler } from "../../../../../../server/api/handler";
import { catalogFor, saveKey } from "../../../../../../server/services/ai/connections.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const body = z.object({
  provider: z.enum(["openai", "anthropic", "google", "openrouter"]),
  apiKey: z.string().trim().min(8, "That key looks too short.").max(400, "That key is too long.").regex(/^\S+$/, "A key has no spaces."),
});

/** Saves a provider key after checking it with the provider. The key is sealed on the server and never returned. */
export const POST = handler({ write: true, body }, async ({ userId, body: b }) => {
  await saveKey(userId, b.provider, b.apiKey);
  return catalogFor(userId);
});

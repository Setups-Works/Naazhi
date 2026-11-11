import { z } from "zod";
import { handler } from "../../../../../server/api/handler";
import { catalogFor, removeConnection } from "../../../../../server/services/ai/connections.service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const provider = z.object({ provider: z.enum(["chatgpt", "openai", "anthropic", "google", "openrouter"]) });

/** What the model picker shows: ChatGPT and each provider, whether the person has connected it, and its models. Never keys or tokens. */
export const GET = handler({}, ({ userId }) => catalogFor(userId));

/** Disconnects a provider (deletes the saved key or sign-in). */
export const DELETE = handler({ write: true }, async ({ userId, query }) => {
  const p = provider.safeParse({ provider: query.get("provider") });
  if (!p.success) return { ok: false };
  await removeConnection(userId, p.data.provider);
  return catalogFor(userId);
});

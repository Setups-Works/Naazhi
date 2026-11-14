import "server-only";
import { isComposioApp } from "../../../lib/composio/apps";
import * as repo from "../../repositories/composioConnections.repository";
import { composio, composioConfigured, webhookSecret } from "./client";

/**
 * Events Composio sends when something happens in a connected app (a new email, a changed calendar event).
 * - The request is not signed-in and not same-origin by nature, so its signature is the only gate: it is checked before anything
 *   in the body is used, and a request older than five minutes is refused as a replay.
 * - An event is accepted only for a connection we know, and only when Composio names the same person as our own record does.
 * - For now an event is only recorded (its ids, never the email or event itself); automations will read these later (UNT-59).
 */
export type TriggerEvent = { id: string; userId: string; connectionId: string; trigger: string };
export type WebhookOutcome = "recorded" | "duplicate" | "ignored";

/** The event in a webhook request, or null when the request is not a genuine one from Composio. */
export async function verifyComposioWebhook(req: Request): Promise<TriggerEvent | null> {
  const secret = webhookSecret();
  if (!secret || !composioConfigured()) return null; // without a secret nothing can be verified, so nothing is accepted
  try {
    const { payload } = await composio().triggers.parse(req, { verifySecret: secret });
    return { id: payload.id, userId: payload.userId, connectionId: payload.metadata.connectedAccount.id, trigger: payload.triggerSlug };
  } catch {
    return null;
  }
}

export async function handleComposioEvent(event: TriggerEvent): Promise<WebhookOutcome> {
  const owner = await repo.findConnectionOwner(event.connectionId);
  if (!owner || owner.user_id !== event.userId || !isComposioApp(owner.app)) return "ignored";
  const isNew = await repo.recordEvent({ id: event.id.slice(0, 200), userId: owner.user_id, app: owner.app, trigger: event.trigger.slice(0, 100) });
  return isNew ? "recorded" : "duplicate";
}

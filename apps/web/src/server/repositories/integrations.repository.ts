import "server-only";
import { withOwner } from "../db/pool";

/**
 * Data access for outside-service connections (Zoho) and the sign-ins in progress. Owner-level on purpose: the browser role has no
 * access to these tables, so everything goes through the integrations service, which has checked the person first. Secrets arrive
 * already sealed and are never logged.
 */
export type IntegrationRow = {
  provider: "zoho";
  secret_cipher: string;
  label: string;
  services: string[];
  scopes: string;
  meta: Record<string, unknown>;
};

const COLS = "provider, secret_cipher, label, services, scopes, meta";

export const getIntegration = (userId: string, provider: "zoho") =>
  withOwner(
    async (c) =>
      (await c.query<IntegrationRow>(`select ${COLS} from public.user_integrations where user_id = $1 and provider = $2`, [userId, provider])).rows[0] ?? null,
  );

export const saveIntegration = (userId: string, row: IntegrationRow) =>
  withOwner(
    async (c) =>
      void (await c.query(
        `insert into public.user_integrations (user_id, provider, secret_cipher, label, services, scopes, meta) values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (user_id, provider) do update set secret_cipher = excluded.secret_cipher, label = excluded.label,
           services = excluded.services, scopes = excluded.scopes, meta = excluded.meta, updated_at = now()`,
        [userId, row.provider, row.secret_cipher, row.label, row.services, row.scopes, JSON.stringify(row.meta)],
      )),
  );

/** Replaces only the sealed tokens and the non-secret meta (after a refresh), leaving the picked services alone. */
export const updateIntegrationTokens = (userId: string, provider: "zoho", secretCipher: string, meta: Record<string, unknown>) =>
  withOwner(
    async (c) =>
      void (await c.query("update public.user_integrations set secret_cipher = $3, meta = $4, updated_at = now() where user_id = $1 and provider = $2", [
        userId,
        provider,
        secretCipher,
        JSON.stringify(meta),
      ])),
  );

export const deleteIntegration = (userId: string, provider: "zoho") =>
  withOwner(async (c) => void (await c.query("delete from public.user_integrations where user_id = $1 and provider = $2", [userId, provider])));

export const saveOAuthState = (userId: string, provider: "zoho", stateHash: string, services: string[], ttlSeconds: number) =>
  withOwner(async (c) => {
    // Old attempts are removed here, so the table never grows without a cleanup job.
    await c.query("delete from public.integration_oauth_states where expires_at < now()");
    await c.query(
      "insert into public.integration_oauth_states (state_hash, user_id, provider, services, expires_at) values ($1, $2, $3, $4, now() + make_interval(secs => $5))",
      [stateHash, userId, provider, services, ttlSeconds],
    );
  });

/** Takes the sign-in attempt if it is the person's own, unexpired and unused. One use only: it is deleted as it is read. */
export const takeOAuthState = (userId: string, provider: "zoho", stateHash: string) =>
  withOwner(
    async (c) =>
      (await c.query<{ services: string[] }>(
        "delete from public.integration_oauth_states where state_hash = $1 and user_id = $2 and provider = $3 and expires_at > now() returning services",
        [stateHash, userId, provider],
      )).rows[0] ?? null,
  );

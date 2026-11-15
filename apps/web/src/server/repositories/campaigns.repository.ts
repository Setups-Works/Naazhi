import "server-only";
import type pg from "pg";
import { withOwner } from "../db/pool";

/** Data access for email campaigns (Admin → Campaigns). Server-only tables: everything runs as the owner after the caller has checked the admin. */

export type Kind = "newsletter" | "direct";
export type Audience = "all" | "picked";
export type Status = "draft" | "sending" | "sent" | "failed";

export type Campaign = {
  id: string;
  subject: string;
  preheader: string;
  html: string;
  kind: Kind;
  audience: Audience;
  picked: string[];
  status: Status;
  createdAt: string;
  sentAt: string | null;
};
export type CampaignSummary = Omit<Campaign, "html" | "picked"> & { queued: number; sent: number; failed: number };
export type Attachment = { id: string; campaignId: string; name: string; contentType: string; sizeBytes: number; storageKey: string };
export type Draft = { subject: string; preheader: string; html: string; kind: Kind; audience: Audience; picked: string[] };

type Row = { id: string; subject: string; preheader: string; html: string; kind: Kind; audience: Audience; picked: string[]; status: Status; created_at: Date; sent_at: Date | null };
const toCampaign = (r: Row): Campaign => ({
  id: r.id,
  subject: r.subject,
  preheader: r.preheader,
  html: r.html,
  kind: r.kind,
  audience: r.audience,
  picked: r.picked ?? [],
  status: r.status,
  createdAt: r.created_at.toISOString(),
  sentAt: r.sent_at?.toISOString() ?? null,
});

export const getCampaign = (id: string) =>
  withOwner(async (c) => {
    const { rows } = await c.query<Row>("select * from public.email_campaigns where id = $1", [id]);
    return rows[0] ? toCampaign(rows[0]) : null;
  });

export const listCampaigns = () =>
  withOwner(async (c) => {
    const { rows } = await c.query<Row & { queued: number; sent: number; failed: number }>(
      `select c.id, c.subject, c.preheader, ''::text as html, c.kind, c.audience, '{}'::uuid[] as picked, c.status, c.created_at, c.sent_at,
              count(r.*) filter (where r.status = 'queued')::int as queued,
              count(r.*) filter (where r.status = 'sent')::int as sent,
              count(r.*) filter (where r.status = 'failed')::int as failed
         from public.email_campaigns c left join public.email_campaign_recipients r on r.campaign_id = c.id
        group by c.id order by c.created_at desc limit 200`,
    );
    return rows.map((r): CampaignSummary => {
      const { html: _html, picked: _picked, ...rest } = toCampaign(r);
      return { ...rest, queued: r.queued, sent: r.sent, failed: r.failed };
    });
  });

export const saveDraft = (adminId: string, id: string | null, d: Draft) =>
  withOwner(async (c) => {
    if (id) {
      const { rowCount } = await c.query(
        `update public.email_campaigns set subject = $2, preheader = $3, html = $4, kind = $5, audience = $6, picked = $7, updated_at = now()
          where id = $1 and status = 'draft'`,
        [id, d.subject, d.preheader, d.html, d.kind, d.audience, d.picked],
      );
      return rowCount ? id : null;
    }
    const { rows } = await c.query<{ id: string }>(
      `insert into public.email_campaigns (subject, preheader, html, kind, audience, picked, created_by) values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [d.subject, d.preheader, d.html, d.kind, d.audience, d.picked, adminId],
    );
    return rows[0]!.id;
  });

/** Deletes a draft and returns its attachment keys so the files can be removed too; null when it is not a draft. */
export const deleteDraft = (id: string) =>
  withOwner(async (c) => {
    const keys = (await c.query<{ storage_key: string }>("select storage_key from public.email_campaign_attachments where campaign_id = $1", [id])).rows.map((r) => r.storage_key);
    const { rowCount } = await c.query("delete from public.email_campaigns where id = $1 and status = 'draft'", [id]);
    return rowCount ? keys : null;
  });

/* ---- attachments ---- */

const toAttachment = (r: { id: string; campaign_id: string; name: string; content_type: string; size_bytes: number; storage_key: string }): Attachment => ({
  id: r.id,
  campaignId: r.campaign_id,
  name: r.name,
  contentType: r.content_type,
  sizeBytes: r.size_bytes,
  storageKey: r.storage_key,
});

export const listAttachments = (campaignId: string) =>
  withOwner(async (c) =>
    (await c.query("select * from public.email_campaign_attachments where campaign_id = $1 order by created_at", [campaignId])).rows.map(toAttachment),
  );

export const addAttachment = (a: Omit<Attachment, "id">) =>
  withOwner(async (c) =>
    toAttachment(
      (
        await c.query(
          `insert into public.email_campaign_attachments (campaign_id, name, content_type, size_bytes, storage_key) values ($1, $2, $3, $4, $5) returning *`,
          [a.campaignId, a.name, a.contentType, a.sizeBytes, a.storageKey],
        )
      ).rows[0],
    ),
  );

/** Removes one attachment of a draft; returns its key, or null. */
export const removeAttachment = (campaignId: string, id: string) =>
  withOwner(async (c) => {
    const { rows } = await c.query<{ storage_key: string }>(
      `delete from public.email_campaign_attachments a using public.email_campaigns k
        where a.id = $2 and a.campaign_id = $1 and k.id = a.campaign_id and k.status = 'draft' returning a.storage_key`,
      [campaignId, id],
    );
    return rows[0]?.storage_key ?? null;
  });

/* ---- sending ---- */

/**
 * Writes one queued row per address and marks the campaign as sending. A newsletter skips unsubscribed addresses; a direct email does not.
 * Banned accounts are never mailed. Returns how many are queued.
 */
export const queueRecipients = (id: string, kind: Kind, audience: Audience, picked: string[]) =>
  withOwner(async (c) => {
    const { rowCount } = await c.query(
      `insert into public.email_campaign_recipients (campaign_id, email, user_id)
         select $1, lower(u.email), u.id from auth.users u
          where u.email is not null and u.email <> ''
            and not coalesce(u.banned, false)
            and ($3 = 'all' or u.id = any($4::uuid[]))
            and ($2 = 'direct' or not exists (select 1 from public.email_unsubscribes x where x.email = lower(u.email)))
         on conflict do nothing`,
      [id, kind, audience, picked],
    );
    if (!rowCount) return 0;
    await c.query("update public.email_campaigns set status = 'sending', updated_at = now() where id = $1 and status = 'draft'", [id]);
    return rowCount;
  });

export type QueuedRow = { email: string; userId: string | null; name: string | null };

/**
 * Works through up to `limit` queued rows inside one transaction (rows another worker holds are skipped, so two workers never mail the
 * same person). `send` returns null on success or a short error code. Marks the campaign sent once nothing is queued.
 */
export const processQueue = (id: string, limit: number, send: (row: QueuedRow) => Promise<string | null>) =>
  withOwner(async (c: pg.PoolClient) => {
    const { rows } = await c.query<{ email: string; user_id: string | null; name: string | null }>(
      `select r.email, r.user_id, u.name from public.email_campaign_recipients r left join auth.users u on u.id = r.user_id
        where r.campaign_id = $1 and r.status = 'queued' order by r.email limit $2 for update of r skip locked`,
      [id, limit],
    );
    let sent = 0;
    let failed = 0;
    for (const r of rows) {
      const error = await send({ email: r.email, userId: r.user_id, name: r.name });
      await c.query(
        "update public.email_campaign_recipients set status = $3, error = $4, sent_at = case when $3 = 'sent' then now() end where campaign_id = $1 and email = $2",
        [id, r.email, error ? "failed" : "sent", error],
      );
      if (error) failed++;
      else sent++;
    }
    const left = (await c.query<{ n: number }>("select count(*)::int as n from public.email_campaign_recipients where campaign_id = $1 and status = 'queued'", [id])).rows[0]!.n;
    if (left === 0) {
      await c.query(
        `update public.email_campaigns set status = case when exists (select 1 from public.email_campaign_recipients where campaign_id = $1 and status = 'sent') then 'sent' else 'failed' end,
                sent_at = now(), updated_at = now() where id = $1 and status = 'sending'`,
        [id],
      );
    }
    return { sent, failed, left };
  });

/** Campaigns that still have people to mail (for the scheduled job). */
export const sendingIds = () =>
  withOwner(async (c) => (await c.query<{ id: string }>("select id from public.email_campaigns where status = 'sending' order by created_at limit 5")).rows.map((r) => r.id));

/** A queued row that failed can be tried again. */
export const requeueFailed = (id: string) =>
  withOwner(async (c) => {
    const { rowCount } = await c.query("update public.email_campaign_recipients set status = 'queued', error = null where campaign_id = $1 and status = 'failed'", [id]);
    if (rowCount) await c.query("update public.email_campaigns set status = 'sending', updated_at = now() where id = $1", [id]);
    return rowCount ?? 0;
  });

/* ---- unsubscribes ---- */

export const unsubscribe = (email: string) =>
  withOwner(async (c) => void (await c.query("insert into public.email_unsubscribes (email) values (lower($1)) on conflict do nothing", [email])));

export const unsubscribedCount = () =>
  withOwner(async (c) => (await c.query<{ n: number }>("select count(*)::int as n from public.email_unsubscribes")).rows[0]!.n);

/** How many people a newsletter would reach right now. */
export const newsletterAudienceSize = () =>
  withOwner(async (c) =>
    (
      await c.query<{ n: number }>(
        `select count(*)::int as n from auth.users u where u.email is not null and u.email <> ''
            and not coalesce(u.banned, false)
            and not exists (select 1 from public.email_unsubscribes x where x.email = lower(u.email))`,
      )
    ).rows[0]!.n,
  );

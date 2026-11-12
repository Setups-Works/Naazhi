import "server-only";
import type { PoolClient } from "pg";
import type { Attachment, JournalPerson, SharedJournalInviteRole, SharedJournalRole } from "@untitled/types";

/**
 * SQL for shared journals (see db/migrations/20261020120000_shared_journals.sql). Functions take the database client the service
 * chose: a `withUser` client, so row-level security decides what exists for the caller, or, only after the service has authorised
 * the action, a `withOwner` client. No permission decisions are made here.
 */

/** A timestamp as an ISO-8601 string (the pool's raw parser would give Postgres' own text format). */
const iso = (col: string) => `(to_jsonb(${col}) #>> '{}')`;

export type JournalRow = {
  id: string;
  name: string;
  owner_id: string;
  role: SharedJournalRole;
  member_count: number;
  entry_count: number;
  last_entry_at: string | null;
  created_at: string;
};

/** The journals the caller can see, most recently written in first; one journal when `id` is given. */
export async function selectJournals(c: PoolClient, id?: string) {
  const lastEntry = "(select max(e.created_at) from public.shared_journal_entries e where e.journal_id = j.id)";
  const { rows } = await c.query<JournalRow>(
    `select j.id, j.name, j.owner_id, ${iso("j.created_at")} as created_at,
            public.shared_journal_role(j.id) as role,
            (select count(*)::int from public.shared_journal_members m where m.journal_id = j.id) + 1 as member_count,
            (select count(*)::int from public.shared_journal_entries e where e.journal_id = j.id) as entry_count,
            ${iso(lastEntry)} as last_entry_at
       from public.shared_journals j
      where ($1::uuid is null or j.id = $1)
      order by coalesce(${lastEntry}, j.created_at) desc
      limit 200`,
    [id ?? null],
  );
  return rows;
}

export async function insertJournal(c: PoolClient, name: string) {
  const { rows } = await c.query<{ id: string }>("insert into public.shared_journals (name) values ($1) returning id", [name]);
  return rows[0].id;
}

export async function updateJournalName(c: PoolClient, id: string, name: string) {
  const r = await c.query("update public.shared_journals set name = $2, updated_at = now() where id = $1", [id, name]);
  return (r.rowCount ?? 0) > 0;
}

export async function deleteJournal(c: PoolClient, id: string) {
  const r = await c.query("delete from public.shared_journals where id = $1", [id]);
  return (r.rowCount ?? 0) > 0;
}

export type MemberRow = { user_id: string; role: SharedJournalInviteRole; joined_at: string };

export async function selectMembers(c: PoolClient, journalId: string) {
  const { rows } = await c.query<MemberRow>(
    `select user_id, role, ${iso("joined_at")} as joined_at from public.shared_journal_members where journal_id = $1 order by joined_at`,
    [journalId],
  );
  return rows;
}

export async function updateMemberRole(c: PoolClient, journalId: string, userId: string, role: SharedJournalInviteRole) {
  const r = await c.query("update public.shared_journal_members set role = $3 where journal_id = $1 and user_id = $2", [
    journalId,
    userId,
    role,
  ]);
  return (r.rowCount ?? 0) > 0;
}

export async function deleteMember(c: PoolClient, journalId: string, userId: string) {
  const r = await c.query("delete from public.shared_journal_members where journal_id = $1 and user_id = $2", [journalId, userId]);
  return (r.rowCount ?? 0) > 0;
}

export async function countMembersAndInvites(c: PoolClient, journalId: string) {
  const { rows } = await c.query<{ n: number }>(
    `select (select count(*) from public.shared_journal_members where journal_id = $1)
          + (select count(*) from public.shared_journal_invites where journal_id = $1 and status = 'pending') as n`,
    [journalId],
  );
  return Number(rows[0].n);
}

export type InviteRow = {
  id: string;
  journal_id: string;
  journal_name: string;
  inviter_id: string;
  /** Empty while the invitation waits for someone to sign up with `invitee_email`. */
  invitee_id: string | null;
  invitee_email: string | null;
  role: SharedJournalInviteRole;
  created_at: string;
};

const INVITE_SELECT = `select i.id, i.journal_id, j.name as journal_name, i.inviter_id, i.invitee_id, i.invitee_email, i.role, ${iso("i.created_at")} as created_at
       from public.shared_journal_invites i join public.shared_journals j on j.id = i.journal_id`;

/** Pending invitations of one journal (the owner's view). */
export async function selectJournalInvites(c: PoolClient, journalId: string) {
  const { rows } = await c.query<InviteRow>(`${INVITE_SELECT} where i.journal_id = $1 and i.status = 'pending' order by i.created_at`, [
    journalId,
  ]);
  return rows;
}

/** Pending invitations addressed to one person. Needs the owner connection: an invitee can't read a journal they haven't joined. */
export async function selectInvitesFor(c: PoolClient, inviteeId: string) {
  const { rows } = await c.query<InviteRow>(
    `${INVITE_SELECT} where i.invitee_id = $1 and i.status = 'pending' order by i.created_at desc limit 100`,
    [inviteeId],
  );
  return rows;
}

export async function findPendingInvite(c: PoolClient, id: string, inviteeId: string) {
  const { rows } = await c.query<{ id: string; journal_id: string; role: SharedJournalInviteRole }>(
    "select id, journal_id, role from public.shared_journal_invites where id = $1 and invitee_id = $2 and status = 'pending' for update",
    [id, inviteeId],
  );
  return rows[0] ?? null;
}

/** An invitation to an account (`inviteeId`) or, when nobody has that address yet, to an email address (`inviteeEmail`, lower-cased). */
export async function insertInvite(
  c: PoolClient,
  v: { journalId: string; inviterId: string; inviteeId?: string | null; inviteeEmail?: string | null; role: SharedJournalInviteRole },
) {
  const { rows } = await c.query<{ id: string }>(
    "insert into public.shared_journal_invites (journal_id, inviter_id, invitee_id, invitee_email, role) values ($1, $2, $3, $4, $5) returning id",
    [v.journalId, v.inviterId, v.inviteeId ?? null, v.inviteeEmail ?? null, v.role],
  );
  return rows[0].id;
}

/** The person's email and whether they have confirmed it. Only a confirmed address may claim invitations sent to it. */
export async function selectEmailStatus(c: PoolClient, userId: string) {
  const { rows } = await c.query<{ email: string; verified: boolean }>("select email, email_verified as verified from auth.users where id = $1", [userId]);
  return rows[0] ?? null;
}

/**
 * Hands the invitations that wait for this (confirmed) address to the person. Ones for a journal they already belong to, or that
 * duplicate an invitation they already hold, are dropped first so the claim can't collide. Returns how many were claimed.
 */
export async function claimEmailInvites(c: PoolClient, userId: string, email: string) {
  const mine = `lower(i.invitee_email) = lower($2) and i.invitee_id is null and i.status = 'pending'`;
  await c.query(
    `delete from public.shared_journal_invites i
      where ${mine}
        and (exists (select 1 from public.shared_journals j where j.id = i.journal_id and j.owner_id = $1)
          or exists (select 1 from public.shared_journal_members m where m.journal_id = i.journal_id and m.user_id = $1)
          or exists (select 1 from public.shared_journal_invites o where o.journal_id = i.journal_id and o.invitee_id = $1 and o.status = 'pending'))`,
    [userId, email],
  );
  const r = await c.query(`update public.shared_journal_invites i set invitee_id = $1 where ${mine}`, [userId, email]);
  return r.rowCount ?? 0;
}

export async function markInvite(c: PoolClient, id: string, status: "accepted" | "declined") {
  await c.query("update public.shared_journal_invites set status = $2, responded_at = now() where id = $1", [id, status]);
}

export async function deleteInvite(c: PoolClient, journalId: string, id: string) {
  const r = await c.query("delete from public.shared_journal_invites where id = $1 and journal_id = $2 and status = 'pending'", [
    id,
    journalId,
  ]);
  return (r.rowCount ?? 0) > 0;
}

export async function addMember(c: PoolClient, journalId: string, userId: string, role: SharedJournalInviteRole) {
  await c.query(
    "insert into public.shared_journal_members (journal_id, user_id, role) values ($1, $2, $3) on conflict (journal_id, user_id) do update set role = excluded.role",
    [journalId, userId, role],
  );
}

export async function isMemberOrOwner(c: PoolClient, journalId: string, userId: string) {
  const { rows } = await c.query(
    `select 1 from public.shared_journals where id = $1 and owner_id = $2
     union select 1 from public.shared_journal_members where journal_id = $1 and user_id = $2`,
    [journalId, userId],
  );
  return rows.length > 0;
}

export type EntryRow = {
  id: string;
  journal_id: string;
  user_id: string;
  entry_date: string;
  body: string;
  kind: "text" | "voice";
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
};

const ENTRY_COLUMNS = `id, journal_id, user_id, entry_date, body, kind, attachments, ${iso("created_at")} as created_at, ${iso("updated_at")} as updated_at`;

/** Newest day first, then oldest entry first within a day. */
export async function selectEntries(c: PoolClient, journalId: string, opts: { limit: number; before?: string }) {
  const { rows } = await c.query<EntryRow>(
    `select ${ENTRY_COLUMNS} from public.shared_journal_entries
      where journal_id = $1 and ($3::date is null or entry_date < $3)
      order by entry_date desc, created_at asc limit $2`,
    [journalId, opts.limit, opts.before ?? null],
  );
  return rows;
}

/** Every entry of one day, oldest first (a day holds at most a few dozen). */
export async function selectEntriesOn(c: PoolClient, journalId: string, day: string) {
  const { rows } = await c.query<EntryRow>(
    `select ${ENTRY_COLUMNS} from public.shared_journal_entries where journal_id = $1 and entry_date = $2 order by created_at asc limit 500`,
    [journalId, day],
  );
  return rows;
}

export type DayRow = { entry_date: string; body: string; attachments: Attachment[] };

/** The raw material for the per-day summary: every entry's date, text and files, oldest first. */
export async function selectDayMaterial(c: PoolClient, journalId: string) {
  const { rows } = await c.query<DayRow>(
    "select entry_date, body, attachments from public.shared_journal_entries where journal_id = $1 order by created_at asc limit 5000",
    [journalId],
  );
  return rows;
}

export async function selectEntry(c: PoolClient, journalId: string, id: string) {
  const { rows } = await c.query<EntryRow>(`select ${ENTRY_COLUMNS} from public.shared_journal_entries where id = $1 and journal_id = $2`, [
    id,
    journalId,
  ]);
  return rows[0] ?? null;
}

export async function insertEntry(
  c: PoolClient,
  v: { journalId: string; date: string; body: string; kind: "text" | "voice"; attachments: Attachment[] },
) {
  const { rows } = await c.query<EntryRow>(
    `insert into public.shared_journal_entries (journal_id, entry_date, body, kind, attachments) values ($1, $2, $3, $4, $5::jsonb) returning ${ENTRY_COLUMNS}`,
    [v.journalId, v.date, v.body, v.kind, JSON.stringify(v.attachments)],
  );
  return rows[0];
}

export async function updateEntry(c: PoolClient, journalId: string, id: string, v: { body?: string; attachments?: Attachment[] }) {
  const { rows } = await c.query<EntryRow>(
    `update public.shared_journal_entries
        set body = coalesce($3, body), attachments = coalesce($4::jsonb, attachments), updated_at = now()
      where id = $1 and journal_id = $2 returning ${ENTRY_COLUMNS}`,
    [id, journalId, v.body ?? null, v.attachments ? JSON.stringify(v.attachments) : null],
  );
  return rows[0] ?? null;
}

export async function deleteEntry(c: PoolClient, journalId: string, id: string) {
  const r = await c.query("delete from public.shared_journal_entries where id = $1 and journal_id = $2", [id, journalId]);
  return (r.rowCount ?? 0) > 0;
}

/** Every attachment path of a journal, so a deleted journal's files can be removed from storage. */
export async function selectAttachmentPaths(c: PoolClient, journalId: string) {
  const { rows } = await c.query<{ path: string }>(
    "select a ->> 'path' as path from public.shared_journal_entries e, jsonb_array_elements(e.attachments) a where e.journal_id = $1",
    [journalId],
  );
  return rows.map((r) => r.path).filter(Boolean);
}

/** People by id. The account tables are closed to signed-in users, so this uses the owner connection: call it only with ids the caller may see. */
export async function selectPeople(c: PoolClient, ids: string[]) {
  if (!ids.length) return new Map<string, JournalPerson>();
  const { rows } = await c.query<JournalPerson>("select id, username, name, image from auth.users where id = any($1::uuid[])", [ids]);
  return new Map(rows.map((r) => [r.id, r]));
}

export async function findUserIdByEmail(c: PoolClient, email: string) {
  const { rows } = await c.query<{ id: string }>("select id from auth.users where lower(email) = $1 and not banned", [email]);
  return rows[0]?.id ?? null;
}

/** Name and address for the notification email. Never returned to a client. */
export async function selectContact(c: PoolClient, id: string) {
  const { rows } = await c.query<{ name: string | null; email: string }>("select name, email from auth.users where id = $1", [id]);
  return rows[0] ?? null;
}

export async function selectJournalName(c: PoolClient, id: string) {
  const { rows } = await c.query<{ name: string }>("select name from public.shared_journals where id = $1", [id]);
  return rows[0]?.name ?? null;
}

export async function findUserIdByUsername(c: PoolClient, username: string) {
  const { rows } = await c.query<{ id: string }>("select id from auth.users where lower(username) = $1 and not banned", [username]);
  return rows[0]?.id ?? null;
}

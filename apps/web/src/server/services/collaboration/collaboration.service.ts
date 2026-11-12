import "server-only";
import { notifyQuietly } from "../notifications/notifications.service";
import type {
  JournalPerson,
  SharedJournal,
  SharedJournalDay,
  SharedJournalDetail,
  SharedJournalEntry,
  SharedJournalInvite,
  SharedJournalInviteRole,
} from "@untitled/types";
import { journalFilePrefix, SHARED_JOURNAL as LIMIT, SHARED_JOURNAL_FILES } from "@untitled/logic";
import { pool, withOwner, withUser } from "../../db/pool";
import { ConflictError, ForbiddenError, NotFoundError, RateLimitError, ValidationError } from "../../errors";
import { underLimit } from "../../rateLimit";
import * as repo from "../../repositories/collaboration.repository";
import { deleteObjects } from "../../storage";
import { sendEmail } from "../../mail";
import { templates } from "../../email/templates";
import { publicEnv, serverEnv } from "../../../config/env";
import { publicPath } from "../../../lib/hosts";
import type { FeedQuery } from "./collaboration.schema";

// Shared journals: named journals several people write in. Owner / editor / viewer, invite by username or email, accept to join.
// Permissions are decided by row-level security in the database; this service adds the rules SQL can't (invitations, limits) and
// turns "not allowed" into friendly errors. A stranger gets "not found", never a hint that the journal exists.

const NOT_FOUND = () => new NotFoundError("That journal doesn’t exist, or you’re not in it.");
const UNKNOWN_PERSON: JournalPerson = { id: "", username: null, name: "Someone", image: null };

async function people(ids: string[]) {
  const unique = [...new Set(ids)];
  const c = await pool().connect();
  try {
    return await repo.selectPeople(c, unique);
  } finally {
    c.release();
  }
}
const person = (map: Map<string, JournalPerson>, id: string): JournalPerson => map.get(id) ?? { ...UNKNOWN_PERSON, id };

function journalFrom(row: repo.JournalRow, map: Map<string, JournalPerson>): SharedJournal {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    owner: person(map, row.owner_id),
    member_count: row.member_count,
    entry_count: row.entry_count,
    last_entry_at: row.last_entry_at,
    created_at: row.created_at,
  };
}

/** Every journal the person owns or belongs to. */
export async function listJournals(userId: string): Promise<SharedJournal[]> {
  const rows = await withUser(userId, (c) => repo.selectJournals(c));
  const map = await people(rows.map((r) => r.owner_id));
  return rows.map((r) => journalFrom(r, map));
}

function inviteFrom(row: repo.InviteRow, map: Map<string, JournalPerson>): SharedJournalInvite {
  return {
    id: row.id,
    journal_id: row.journal_id,
    journal_name: row.journal_name,
    role: row.role,
    // An invitation to an address with no account yet has no person: stand in with the address as the name (the owner typed it).
    invitee: row.invitee_id ? person(map, row.invitee_id) : { ...UNKNOWN_PERSON, name: row.invitee_email ?? "Someone" },
    invitee_email: row.invitee_id ? null : row.invitee_email,
    inviter: person(map, row.inviter_id),
    created_at: row.created_at,
  };
}

/** One journal with its people. Open invitations are only included for the owner. */
export async function getJournal(userId: string, id: string): Promise<SharedJournalDetail> {
  const { row, members, invites } = await withUser(userId, async (c) => {
    const [row] = await repo.selectJournals(c, id);
    if (!row) return { row: null, members: [], invites: [] };
    const members = await repo.selectMembers(c, id);
    const invites = row.role === "owner" ? await repo.selectJournalInvites(c, id) : [];
    return { row, members, invites };
  });
  if (!row) throw NOT_FOUND();
  const map = await people([row.owner_id, ...members.map((m) => m.user_id), ...invites.flatMap((i) => [i.inviter_id, i.invitee_id ?? i.inviter_id])]);
  return {
    ...journalFrom(row, map),
    me: userId,
    members: [
      { person: person(map, row.owner_id), role: "owner", joined_at: row.created_at },
      ...members.map((m) => ({ person: person(map, m.user_id), role: m.role, joined_at: m.joined_at })),
    ],
    invites: invites.map((i) => inviteFrom(i, map)),
  };
}

export async function createJournal(userId: string, name: string) {
  const id = await withUser(userId, (c) => repo.insertJournal(c, name));
  return getJournal(userId, id);
}

async function roleIn(userId: string, journalId: string) {
  const [row] = await withUser(userId, (c) => repo.selectJournals(c, journalId));
  if (!row) throw NOT_FOUND();
  return row.role;
}

async function requireOwner(userId: string, journalId: string) {
  if ((await roleIn(userId, journalId)) !== "owner") throw new ForbiddenError("Only the owner can do that.");
}

export async function renameJournal(userId: string, journalId: string, name: string) {
  await requireOwner(userId, journalId);
  await withUser(userId, (c) => repo.updateJournalName(c, journalId, name));
  return getJournal(userId, journalId);
}

/** Deletes the journal, its entries and its people, and the files attached to its entries. */
export async function deleteJournal(userId: string, journalId: string) {
  await requireOwner(userId, journalId);
  const paths = await withUser(userId, async (c) => {
    const found = await repo.selectAttachmentPaths(c, journalId);
    await repo.deleteJournal(c, journalId);
    return found;
  });
  await removeFiles(paths);
}

async function removeFiles(paths: string[]) {
  // Files live in object storage; failing to remove one must not undo the deletion the person asked for.
  for (let i = 0; i < paths.length; i += 1000) await deleteObjects("note-files", paths.slice(i, i + 1000)).catch(() => undefined);
}

/** Invite someone by username. They are not added until they accept. */
export async function inviteByUsername(userId: string, journalId: string, username: string, role: SharedJournalInviteRole) {
  return invite(userId, journalId, { find: (c) => repo.findUserIdByUsername(c, username), notFound: "No one has that username." }, role);
}

/**
 * Invite someone by email address. If an account uses that address they get the invitation straight away; if not, the invitation waits
 * for whoever signs up with (and confirms) that address, and the email tells them to. Either way the answer is the same shape (an id),
 * so this can't be used to find out who has an account.
 */
export async function inviteByEmail(userId: string, journalId: string, email: string, role: SharedJournalInviteRole) {
  const address = email.trim().toLowerCase();
  return invite(userId, journalId, { find: (c) => repo.findUserIdByEmail(c, address), notFound: null, email: address }, role);
}

type Target = {
  find: (c: Parameters<Parameters<typeof withOwner>[0]>[0]) => Promise<string | null>;
  /** What to say when nobody matches; null for an email, which then waits for the person to sign up. */
  notFound: string | null;
  email?: string;
};

/** A link into the app's own pages: the app's address when it has one, with the /dashboard prefix dropped there (see lib/hosts.ts). */
function appUrl(path: string) {
  const base = (publicEnv.appUrl ?? serverEnv().authUrl).replace(/\/$/, "");
  return `${base}${publicPath(path)}`;
}

const COLLAB_PATH = "/dashboard/journal/collaborate";

async function invite(userId: string, journalId: string, target: Target, role: SharedJournalInviteRole): Promise<{ id: string }> {
  await requireOwner(userId, journalId);
  if (!(await underLimit(`invite:${userId}`, LIMIT.invitesPerHour, 3600)))
    throw new RateLimitError("You’ve sent a lot of invitations. Try again in a little while.");
  const made = await withOwner(async (c) => {
    // The owner connection bypasses RLS, so every check below is ours to make.
    const inviteeId = await target.find(c);
    if (!inviteeId && !target.email) throw new NotFoundError(target.notFound ?? "No one has that username.");
    if (inviteeId === userId) throw new ValidationError("You’re already in this journal.");
    if (inviteeId && (await repo.isMemberOrOwner(c, journalId, inviteeId))) throw new ConflictError("They’re already in this journal.");
    if ((await repo.countMembersAndInvites(c, journalId)) + 1 >= LIMIT.maxPeople)
      throw new ConflictError(`A journal holds up to ${LIMIT.maxPeople} people.`);
    try {
      const id = await repo.insertInvite(c, { journalId, inviterId: userId, inviteeId, inviteeEmail: inviteeId ? null : target.email, role });
      const [to, from, journal] = await Promise.all([
        inviteeId ? repo.selectContact(c, inviteeId) : Promise.resolve(target.email ? { email: target.email, name: null } : null),
        repo.selectContact(c, userId),
        repo.selectJournalName(c, journalId),
      ]);
      return { id, to, from, journal, inviteeId };
    } catch (e) {
      // The partial unique indexes allow one open invitation per person (or per address).
      if ((e as { code?: string }).code === "23505") throw new ConflictError("They already have an invitation to this journal.");
      throw e;
    }
  });
  // The invitation is saved either way; a mail problem must not fail it (they also see it the next time they open the app).
  if (made.to)
    void sendEmail(
      made.to.email,
      templates.journalInvite({
        from: made.from?.name || "Someone",
        journal: made.journal ?? "Shared journal",
        role,
        // With an account: straight to the invitations (the app opens it when installed). Without: sign up first, then come back to them.
        url: made.inviteeId ? appUrl(COLLAB_PATH) : `${appUrl("/signup")}?next=${encodeURIComponent(publicPath(COLLAB_PATH))}`,
        needsAccount: !made.inviteeId,
      }),
    ).catch(() => undefined);
  // And a notification in their inbox and on their phone, if they have an account (and the app).
  if (made.inviteeId)
    notifyQuietly([made.inviteeId], {
      kind: "invite",
      title: "Shared journal invitation",
      body: `${made.from?.name || "Someone"} invited you to write in “${made.journal ?? "Shared journal"}”.`,
      url: "/journal/collaborate",
    });
  return { id: made.id };
}

export async function cancelInvite(userId: string, journalId: string, inviteId: string) {
  await requireOwner(userId, journalId);
  if (!(await withUser(userId, (c) => repo.deleteInvite(c, journalId, inviteId)))) throw new NotFoundError("That invitation is gone.");
}

/** Invitations waiting for the person to answer. */
export async function listMyInvites(userId: string): Promise<SharedJournalInvite[]> {
  const rows = await withOwner(async (c) => {
    // Invitations sent to the person's email before they had an account become theirs once that address is confirmed.
    const who = await repo.selectEmailStatus(c, userId);
    if (who?.verified) await repo.claimEmailInvites(c, userId, who.email);
    return repo.selectInvitesFor(c, userId);
  });
  const map = await people(rows.flatMap((r) => [r.inviter_id, r.invitee_id ?? r.inviter_id]));
  return rows.map((r) => inviteFrom(r, map));
}

/** Accept (become a member with the invited role) or decline. Only the invited person can answer, and only once. */
export async function respondToInvite(userId: string, inviteId: string, action: "accept" | "decline") {
  return withOwner(async (c) => {
    const invite = await repo.findPendingInvite(c, inviteId, userId);
    if (!invite) throw new NotFoundError("That invitation is no longer open.");
    if (action === "accept") await repo.addMember(c, invite.journal_id, userId, invite.role);
    await repo.markInvite(c, inviteId, action === "accept" ? "accepted" : "declined");
    return { journalId: invite.journal_id };
  });
}

export async function changeRole(userId: string, journalId: string, memberId: string, role: SharedJournalInviteRole) {
  await requireOwner(userId, journalId);
  if (!(await withUser(userId, (c) => repo.updateMemberRole(c, journalId, memberId, role))))
    throw new NotFoundError("They aren’t in this journal.");
}

/** The owner removes someone, or a member leaves (their own id). The owner can't leave: they delete the journal instead. */
export async function removeMember(userId: string, journalId: string, memberId: string) {
  const role = await roleIn(userId, journalId);
  if (memberId !== userId && role !== "owner") throw new ForbiddenError("Only the owner can remove people.");
  if (memberId === userId && role === "owner") throw new ValidationError("You own this journal. Delete it instead of leaving.");
  if (!(await withUser(userId, (c) => repo.deleteMember(c, journalId, memberId)))) throw new NotFoundError("They aren’t in this journal.");
}

/* ---- entries ---- */

async function withAuthors(rows: repo.EntryRow[]): Promise<SharedJournalEntry[]> {
  const map = await people(rows.map((r) => r.user_id));
  return rows.map(({ user_id, ...r }) => ({ ...r, author: person(map, user_id) }));
}

/** A page of entries, newest day first; pass the oldest day you have as `cursor` for the next page. */
export async function listEntries(userId: string, journalId: string, { cursor, limit, date }: FeedQuery) {
  await roleIn(userId, journalId); // 404 for strangers rather than an empty list
  if (date) return { entries: await withAuthors(await withUser(userId, (c) => repo.selectEntriesOn(c, journalId, date))), more: false };
  const rows = await withUser(userId, (c) => repo.selectEntries(c, journalId, { limit: limit + 1, before: cursor }));
  return { entries: await withAuthors(rows.slice(0, limit)), more: rows.length > limit };
}

/** A short summary per day that has writing, oldest day first: the entry count and the first words and photo (for the calendar, the list of days and the sidebar). */
export async function listDays(userId: string, journalId: string): Promise<SharedJournalDay[]> {
  await roleIn(userId, journalId);
  const rows = await withUser(userId, (c) => repo.selectDayMaterial(c, journalId));
  const by = new Map<string, SharedJournalDay>();
  for (const r of rows) {
    const image = r.attachments.find((a) => a.type.startsWith("image/"))?.path ?? null;
    const cur = by.get(r.entry_date);
    if (!cur) by.set(r.entry_date, { date: r.entry_date, count: 1, body: r.body.trim().slice(0, 160), image });
    else {
      cur.count += 1;
      if (!cur.body && r.body.trim()) cur.body = r.body.trim().slice(0, 160);
      if (!cur.image && image) cur.image = image;
    }
  }
  return [...by.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function addEntry(
  userId: string,
  journalId: string,
  input: { entry_date: string; body: string; kind: "text" | "voice"; attachments: repo.EntryRow["attachments"] },
) {
  const role = await roleIn(userId, journalId);
  if (role === "viewer") throw new ForbiddenError("You can read this journal but not write in it.");
  const own = (p: string) => p.startsWith(journalFilePrefix(userId, journalId));
  if (!input.attachments.every((a) => own(a.path))) throw new ValidationError("Those files can’t be attached here.");
  const row = await withUser(userId, (c) =>
    repo.insertEntry(c, { journalId, date: input.entry_date, body: input.body, kind: input.kind, attachments: input.attachments }),
  );
  return (await withAuthors([row]))[0];
}

export async function editEntry(
  userId: string,
  journalId: string,
  entryId: string,
  input: { body?: string; attachments?: repo.EntryRow["attachments"] },
) {
  await roleIn(userId, journalId);
  const own = (p: string) => p.startsWith(journalFilePrefix(userId, journalId));
  if (input.attachments && !input.attachments.every((a) => own(a.path))) throw new ValidationError("Those files can’t be attached here.");
  // The row-level policy lets only the author update, so someone else's entry simply isn't found.
  const { row, before } = await withUser(userId, async (c) => {
    const before = input.attachments ? await repo.selectEntry(c, journalId, entryId) : null;
    return { row: await repo.updateEntry(c, journalId, entryId, input), before };
  });
  if (!row) throw new NotFoundError("That entry isn’t yours to change.");
  // Files taken out of the entry are deleted from storage once the change is saved.
  if (before && input.attachments) {
    const keep = new Set(input.attachments.map((a) => a.path));
    await removeFiles(before.attachments.map((a) => a.path).filter((p) => !keep.has(p)));
  }
  return (await withAuthors([row]))[0];
}

/** Authors delete their own entries; the owner can delete anyone's. Its files go with it. */
export async function removeEntry(userId: string, journalId: string, entryId: string) {
  await roleIn(userId, journalId);
  const paths = await withUser(userId, async (c) => {
    const entry = await repo.selectEntry(c, journalId, entryId);
    if (!entry || !(await repo.deleteEntry(c, journalId, entryId))) return null;
    return entry.attachments.map((a) => a.path);
  });
  if (!paths) throw new NotFoundError("That entry isn’t yours to delete.");
  await removeFiles(paths);
}

/* ---- files attached to entries ---- */

const FILE_KEY = new RegExp(`^([0-9a-f-]{36})/${SHARED_JOURNAL_FILES}/([0-9a-f-]{36})/`, "i");

/**
 * Whether the person may use a storage key under `<author>/shared-journal/<journal>/`: anyone in the journal may read it, and
 * owners and editors may upload into their own folder of it. Returns null for any other kind of key (the normal owner-only rule applies).
 */
export async function mayUseJournalFile(userId: string, key: string, write: boolean): Promise<boolean | null> {
  const m = FILE_KEY.exec(key);
  if (!m) return null;
  const [, author, journalId] = m;
  const [row] = await withUser(userId, (c) => repo.selectJournals(c, journalId));
  if (!row) return false;
  if (!write) return true;
  return author.toLowerCase() === userId.toLowerCase() && row.role !== "viewer";
}

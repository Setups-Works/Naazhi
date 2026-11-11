import "server-only";
import { randomBytes } from "node:crypto";
import { adminDb, userDb } from "../../db/builders";
import { NotFoundError } from "../../errors";
import { findDayShareToken, findSharedDay, findSharedEntry, listDayEntries, setDayShareToken, setJournalShareToken } from "../../repositories/journal.repository";
import { objectUrl, ownsKey, validKey } from "../../storage";

// Journal entries are private to their author. The one way out is a secret link to a single entry, which the author can switch off
// at any time. The link carries a random token; the public page finds the entry by exact token, so nothing can be enumerated.

/** How long the links to an entry's pictures and audio stay valid on the public page. */
const FILE_LINK_SECONDS = 3600;

/** Turns the public link of one of the person's entries on (a new token) or off. Returns the token, or null when switched off. */
export async function setEntryShared(userId: string, entryId: string, shared: boolean) {
  const token = shared ? randomBytes(16).toString("hex") : null;
  const row = await setJournalShareToken(userDb(userId), entryId, token);
  if (!row) throw new NotFoundError("That entry doesn’t exist.");
  return row.share_token;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (date: string) => {
  if (!DAY.test(date)) throw new NotFoundError("That day doesn’t exist.");
  return date;
};

/** The current public-link token for one of the person's days, or null when the day is private. */
export const getDayShare = (userId: string, date: string) => findDayShareToken(userDb(userId), validDay(date));

/** Turns the public link of a whole day on (a new token) or off. Returns the token, or null when switched off. */
export async function setDayShared(userId: string, date: string, shared: boolean) {
  return setDayShareToken(userDb(userId), validDay(date), shared ? randomBytes(16).toString("hex") : null);
}

export type PublicDay = { entryDate: string; entries: PublicEntry[] };

/** Every entry of a shared day, for the public page: found by exact token, no author identity, files signed only from the author's folder. */
export async function getPublicDay(token: string): Promise<PublicDay | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const db = adminDb();
  const day = await findSharedDay(db, token);
  if (!day) return null;
  const rows = await listDayEntries(db, day.user_id, day.entry_date);
  return {
    entryDate: day.entry_date,
    entries: rows.map((row) => ({
      entryDate: row.entry_date,
      createdAt: row.created_at,
      sharedAt: row.shared_at,
      body: row.body,
      kind: row.kind,
      files: row.attachments.map((a) => ({
        name: a.name,
        type: a.type,
        url: validKey(a.path) && ownsKey(row.user_id, a.path) ? objectUrl("note-files", a.path, FILE_LINK_SECONDS) : null,
      })),
    })),
  };
}

export type PublicEntry = {
  entryDate: string;
  createdAt: string;
  sharedAt: string | null;
  body: string;
  kind: "text" | "voice";
  files: { name: string; type: string; url: string | null }[];
};

/**
 * What the public page shows for a token: the entry's text and files, no author identity. Looked up with the owner connection by exact
 * token (a token that doesn't exist is simply not found). Files are only signed when they live in the entry author's own folder,
 * because attachment paths are user-supplied data.
 */
export async function getPublicEntry(token: string): Promise<PublicEntry | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const row = await findSharedEntry(adminDb(), token);
  if (!row) return null;
  return {
    entryDate: row.entry_date,
    createdAt: row.created_at,
    sharedAt: row.shared_at,
    body: row.body,
    kind: row.kind,
    files: row.attachments.map((a) => ({
      name: a.name,
      type: a.type,
      url: validKey(a.path) && ownsKey(row.user_id, a.path) ? objectUrl("note-files", a.path, FILE_LINK_SECONDS) : null,
    })),
  };
}

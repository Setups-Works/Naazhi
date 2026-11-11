import "server-only";
import { randomBytes } from "node:crypto";
import { adminDb, userDb } from "../../db/builders";
import { NotFoundError } from "../../errors";
import { findSharedNote, setNoteShareToken } from "../../repositories/notes.repository";
import { objectUrl, ownsKey, validKey } from "../../storage";

// Notes are private to their owner. The one way out is a secret link to a single note, which the owner can switch off at any time.
// The link carries a random token; the public page finds the note by exact token, so nothing can be enumerated.

/** How long the links to a note's pictures and audio stay valid on the public page. */
const FILE_LINK_SECONDS = 3600;

/** Turns the public link of one of the person's notes on (a new token) or off. Returns the token, or null when switched off. */
export async function setNoteShared(userId: string, noteId: string, shared: boolean) {
  const token = shared ? randomBytes(16).toString("hex") : null;
  const row = await setNoteShareToken(userDb(userId), noteId, token);
  if (!row) throw new NotFoundError("That note doesn’t exist.");
  return row.share_token;
}

export type PublicNote = {
  title: string;
  updatedAt: string;
  sharedAt: string | null;
  body: string;
  files: { name: string; type: string; url: string | null }[];
};

/**
 * What the public page shows for a token: the note's title, text and files, no owner identity. Looked up with the owner connection by
 * exact token. Files are only signed when they live in the note owner's own folder, because attachment paths are user-supplied data.
 */
export async function getPublicNote(token: string): Promise<PublicNote | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const row = await findSharedNote(adminDb(), token);
  if (!row) return null;
  return {
    title: row.title,
    updatedAt: row.updated_at,
    sharedAt: row.shared_at,
    body: row.body,
    files: row.attachments.map((a) => ({
      name: a.name,
      type: a.type,
      url: validKey(a.path) && ownsKey(row.user_id, a.path) ? objectUrl("note-files", a.path, FILE_LINK_SECONDS) : null,
    })),
  };
}

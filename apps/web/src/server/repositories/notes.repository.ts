import "server-only";
import type { userDb } from "../db/builders";

type Db = ReturnType<typeof userDb>;

export async function createNote(db: Db, input: { title: string; body: string }) {
  const { data, error } = await db
    .from("notes")
    .insert({ ...input, category: "Others" })
    .select("id")
    .single();
  if (error || !data) throw new Error("Could not create note");
  return data as { id: string };
}

/** Sets or clears a note's public link token. Runs as the user, so only the owner's own note is found. Returns the new token (or null). */
export async function setNoteShareToken(db: Db, id: string, token: string | null) {
  const { data, error } = await db
    .from("notes")
    .update({ share_token: token, shared_at: token ? new Date().toISOString() : null })
    .eq("id", id)
    .is("deleted_at", null)
    .select("share_token")
    .maybeSingle();
  if (error) throw new Error("Could not change note sharing");
  return data ? { share_token: (data as { share_token: string | null }).share_token } : null;
}

export type SharedNoteRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  attachments: { path: string; name: string; type: string; size: number }[];
  updated_at: string;
  shared_at: string | null;
};

/** The note behind a public link, found by exact token. A trashed note is no longer shared. Never exposes lists. */
export async function findSharedNote(db: Db, token: string) {
  const { data } = await db
    .from<SharedNoteRow>("notes")
    .select("id,user_id,title,body,attachments,updated_at,shared_at")
    .eq("share_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as SharedNoteRow | null) ?? null;
}

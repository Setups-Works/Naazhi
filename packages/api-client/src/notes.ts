import type { Http } from "./sharedJournals";

/** Turn the public link of one of your notes on or off; resolves to the new token, or null when switched off. */
export async function setNoteShared(http: Http, id: string, shared: boolean) {
  const res = await http.post<{ data: { share_token: string | null } }>(`/api/v1/notes/${id}/share`, { shared });
  return res.data.share_token;
}

/** The address of the public page for a note's token, on the given origin. */
export const noteShareUrl = (origin: string, token: string) => `${origin.replace(/\/+$/, "")}/share/note/${token}`;

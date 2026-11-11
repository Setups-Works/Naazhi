import type { Http } from "./sharedJournals";

/** Turn the public link of one of your journal entries on or off; resolves to the new token, or null when switched off. */
export async function setJournalEntryShared(http: Http, id: string, shared: boolean) {
  const res = await http.post<{ data: { share_token: string | null } }>(`/api/v1/journal/${id}/share`, { shared });
  return res.data.share_token;
}

/** The address of the public page for a token, on the given origin. */
export const journalShareUrl = (origin: string, token: string) => `${origin.replace(/\/+$/, "")}/share/journal/${token}`;

/** The public-link token of one journal day (`YYYY-MM-DD`), or null while the day is private. */
export async function fetchJournalDayShare(http: Http, date: string) {
  const res = await http.get<{ data: { share_token: string | null } }>(`/api/v1/journal/day/share?date=${encodeURIComponent(date)}`);
  return res.data.share_token;
}

/** Turn the public link of a whole day on or off; resolves to the new token, or null when switched off. */
export async function setJournalDayShared(http: Http, date: string, shared: boolean) {
  const res = await http.post<{ data: { share_token: string | null } }>("/api/v1/journal/day/share", { date, shared });
  return res.data.share_token;
}

/** The address of the public page for a shared day. */
export const journalDayShareUrl = (origin: string, token: string) => `${origin.replace(/\/+$/, "")}/share/journal/day/${token}`;

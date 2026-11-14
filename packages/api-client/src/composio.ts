import type { ComposioAppId, ComposioItems, ComposioStatus, ImportedGoogleEvent } from "@untitled/types";
import type { Http } from "./sharedJournals";

/**
 * Google apps connected with one Google sign-in (Gmail, Google Calendar, Google Drive), written once for the web and the Expo app.
 * Routes: apps/web/src/app/api/v1/integrations/composio.
 */
type Data<T> = { data: T };
const base = "/api/v1/integrations/composio";

export function createComposioApi(http: Http) {
  const unwrap = async <T>(p: Promise<Data<T>>) => (await p).data;
  return {
    status: () => unwrap(http.get<Data<ComposioStatus>>(base)),
    /** The address of Google's approval page (one sign-in for every Google app). Open it in the browser; the person comes back to Settings. */
    start: () => unwrap(http.post<Data<{ url: string }>>(`${base}/start`, {})),
    disconnect: () => unwrap(http.delete<Data<ComposioStatus>>(base)),
    /** The Google Calendar events to save in the Naazhi calendar (all-day events as dates, timed ones with their offset). */
    calendarEvents: () => unwrap(http.get<Data<{ events: ImportedGoogleEvent[]; truncated: boolean }>>(`${base}/calendar-events`)),
    /** Saves one Google Calendar event as a journal entry on its day; the server reads the event itself. */
    saveEventToJournal: (event_id: string) => unwrap(http.post<Data<{ id: string; entry_date: string; path: string }>>(`${base}/journal`, { event_id })),
    items: (app: ComposioAppId, view?: string, q?: string) =>
      unwrap(http.get<Data<ComposioItems>>(`${base}/items?${new URLSearchParams({ app, ...(view ? { view } : {}), ...(q ? { q } : {}) })}`)),
  };
}
export type ComposioApi = ReturnType<typeof createComposioApi>;

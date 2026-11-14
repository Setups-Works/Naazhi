"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createComposioApi, type Http } from "@untitled/api-client";
import type { ComposioAppId, ComposioItems, ComposioStatus } from "../../lib/composio/apps";
import { api as createDb } from "../../lib/api/client";
import { qk } from "../../lib/query/keys";

/** `calendar_id` of events that came from Google Calendar, so they stay apart from the ones made in Naazhi. */
const GOOGLE_CALENDAR_ID = "google";

/**
 * Data layer for the Google apps (Gmail, Calendar, Drive): the Settings card (connect, disconnect) and the chat cards. The browser only ever
 * talks to our own /api/v1 routes; the Google tokens never leave the server.
 */
async function call<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
  const j = (await res.json().catch(() => null)) as { data?: unknown; error?: string } | null;
  if (!res.ok || !j || j.data === undefined) throw new Error(j?.error ?? "Couldn’t reach that app. Try again.");
  return j as T;
}

const http: Http = {
  get: (path) => call("GET", path),
  post: (path, body) => call("POST", path, body),
  patch: (path, body) => call("POST", path, body), // not used by the composio API
  delete: (path) => call("DELETE", path),
};
const api = createComposioApi(http);

export const useComposioStatus = () => useQuery<ComposioStatus>({ queryKey: qk.composio.status, queryFn: api.status, staleTime: 60_000 });

/** Sends the person to Google's approval page, once for every Google app. They come back to Settings when it is done. */
export function useConnectComposio() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await api.start();
      window.location.assign(url);
    },
  });
}

export function useDisconnectComposio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.disconnect(),
    onSuccess: (status) => {
      qc.setQueryData(qk.composio.status, status);
      void qc.invalidateQueries({ queryKey: qk.composio.allItems });
    },
  });
}

export const useComposioItems = (app: ComposioAppId, view: string, q: string) =>
  useQuery<ComposioItems>({ queryKey: qk.composio.items(app, view, q), queryFn: () => api.items(app, view, q), staleTime: 60_000, retry: false });

/** Saves a calendar event in the journal (on the event's day). */
export const useSaveEventToJournal = () => useMutation({ mutationFn: (eventId: string) => api.saveEventToJournal(eventId) });

/** Window of the import's progress for the Calendar page. */
export type ImportResult = { count: number; truncated: boolean };

const CHUNK = 400; // the database layer takes at most 500 rows per call

/**
 * Saves the person's Google Calendar events in the Naazhi calendar. The server reads them from Google; the browser turns them into rows
 * (it alone knows the person's time zone, which an all-day event needs) and saves them with an upsert keyed on the Google id, so
 * importing again updates the same events instead of adding copies.
 */
export function useImportGoogleCalendar() {
  const qc = useQueryClient();
  return useMutation<ImportResult>({
    mutationFn: async () => {
      const { events, truncated } = await api.calendarEvents();
      const sb = createDb();
      const rows = events.map((e) => ({
        external_id: e.external_id,
        calendar_id: GOOGLE_CALENDAR_ID,
        title: e.title,
        description: e.description,
        location: e.location,
        all_day: e.all_day,
        start_at: (e.all_day ? new Date(`${e.start}T00:00:00`) : new Date(e.start)).toISOString(),
        end_at: (e.all_day ? new Date(`${e.end}T23:59:59`) : new Date(e.end)).toISOString(),
        color: "blue",
      }));
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await sb.from("calendar_events").upsert(rows.slice(i, i + CHUNK), { onConflict: "user_id,calendar_id,external_id" });
        if (error) throw new Error("Couldn’t save your Google events. Try again.");
      }
      return { count: rows.length, truncated };
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.calendar.events }),
  });
}

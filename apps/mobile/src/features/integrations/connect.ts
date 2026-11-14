import { createComposioApi, createNotionApi } from "@untitled/api-client";
import type { ComposioStatus, NotionImportResult, NotionStatus } from "@untitled/types";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";

import { mobileEnv } from "@/config/env";
import { dbQuery } from "@/features/chat/db";
import { qk } from "@/lib/queryKeys";
import { api } from "@/lib/api";
import { openWeb } from "@/lib/webSheet";

/**
 * Google (Gmail, Calendar, Drive) and Notion for the phone, on the same server routes as the web. The sign-in opens in the app's web
 * sheet and closes by itself when the server sends the person back to a Settings page. The server finishes the sign-in without the
 * phone's session (the sheet doesn't carry it to Google's or Notion's pages), so there is nothing else to do here but read the status again.
 */
export const googleApi = createComposioApi(api);
const google = googleApi;
const notion = createNotionApi(api);

export const GOOGLE_KEY = ["google", "status"] as const;
export const NOTION_KEY = ["notion", "status"] as const;

const backToSettings = (u: string) => !!mobileEnv.apiBaseUrl && u.startsWith(mobileEnv.apiBaseUrl) && /\/settings\/(google|imports)/.test(u);

/** Reads a status again whenever the app comes back to the foreground (the sign-in may have finished in the browser). */
function useRefreshOnForeground(key: readonly string[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && void qc.invalidateQueries({ queryKey: key }));
    return () => sub.remove();
  }, [qc, key]);
}

export function useGoogleStatus() {
  useRefreshOnForeground(GOOGLE_KEY);
  return useQuery<ComposioStatus>({ queryKey: GOOGLE_KEY, queryFn: google.status });
}

export function useConnectGoogle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { url } = await google.start();
      openWeb(url, { title: "Google", closeOn: backToSettings, onClose: () => void qc.invalidateQueries({ queryKey: GOOGLE_KEY }) });
    },
  });
}

export function useDisconnectGoogle() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => google.disconnect(), onSuccess: (s) => qc.setQueryData(GOOGLE_KEY, s) });
}

export function useNotionStatus() {
  useRefreshOnForeground(NOTION_KEY);
  return useQuery<NotionStatus>({ queryKey: NOTION_KEY, queryFn: notion.status });
}

export function useConnectNotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { url } = await notion.start();
      openWeb(url, { title: "Notion", closeOn: backToSettings, onClose: () => void qc.invalidateQueries({ queryKey: NOTION_KEY }) });
    },
  });
}

export function useDisconnectNotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notion.disconnect(),
    onSuccess: (s) => {
      qc.setQueryData(NOTION_KEY, s);
      void qc.invalidateQueries({ queryKey: ["notion", "pages"] });
    },
  });
}

export const useNotionPages = (q: string, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: ["notion", "pages", q],
    queryFn: ({ pageParam }) => notion.pages(pageParam || undefined, q || undefined),
    initialPageParam: "",
    getNextPageParam: (last) => last.next ?? undefined,
    enabled,
    retry: false,
  });

const CHUNK = 20; // what the server takes in one import

/** Imports the chosen Notion pages as notes, 20 at a time, adding up the results. */
export function useImportNotion() {
  const qc = useQueryClient();
  return useMutation<NotionImportResult, Error, string[]>({
    mutationFn: async (ids) => {
      const total: NotionImportResult = { imported: 0, skipped: 0, failed: 0 };
      for (let i = 0; i < ids.length; i += CHUNK) {
        const r = await notion.importPages(ids.slice(i, i + CHUNK));
        total.imported += r.imported;
        total.skipped += r.skipped;
        total.failed += r.failed;
      }
      return total;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["notion", "pages"] });
      void qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

const CAL_CHUNK = 400; // the database door takes at most 500 rows per call
/** `calendar_id` of events that came from Google Calendar, so they stay apart from the ones made in Naazhi (same as the web). */
const GOOGLE_CALENDAR_ID = "google";

/**
 * Saves the person's Google Calendar events in the Naazhi calendar: the server reads them from Google, the phone turns them into rows
 * (it alone knows the local time zone an all-day event needs) and upserts them keyed on the Google id, so importing again adds no copies.
 */
export function useImportGoogleCalendar() {
  const qc = useQueryClient();
  return useMutation<{ count: number; truncated: boolean }>({
    mutationFn: async () => {
      const { events, truncated } = await googleApi.calendarEvents();
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
      for (let i = 0; i < rows.length; i += CAL_CHUNK)
        await dbQuery({ table: "calendar_events", op: "upsert", onConflict: "user_id,calendar_id,external_id", values: rows.slice(i, i + CAL_CHUNK) });
      return { count: rows.length, truncated };
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: qk.calendar }),
  });
}

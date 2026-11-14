import { createComposioApi, createNotionApi } from "@untitled/api-client";
import type { ComposioStatus, NotionImportResult, NotionStatus } from "@untitled/types";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";

import { mobileEnv } from "@/config/env";
import { api } from "@/lib/api";
import { openWeb } from "@/lib/webSheet";

/**
 * Google (Gmail, Calendar, Drive) and Notion for the phone, on the same server routes as the web. The sign-in opens in the app's web
 * sheet and closes by itself when the server sends the person back to a Settings page. The server finishes the sign-in without the
 * phone's session (the sheet doesn't carry it to Google's or Notion's pages), so there is nothing else to do here but read the status again.
 */
const google = createComposioApi(api);
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

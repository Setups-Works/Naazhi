"use client";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createNotionApi, type Http } from "@untitled/api-client";
import type { NotionImportResult, NotionStatus } from "@untitled/types";
import { rememberConnectReturn } from "../../lib/connectReturn";
import { qk } from "../../lib/query/keys";

/**
 * Data layer for the Notion import (Settings → Imports & backup). The browser only talks to our own /api/v1 routes; the Composio key
 * and the connection never leave the server.
 */
async function call<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
  const j = (await res.json().catch(() => null)) as { data?: unknown; error?: string } | null;
  if (!res.ok || !j || j.data === undefined) throw new Error(j?.error ?? "Couldn’t reach Notion. Try again.");
  return j as T;
}

const http: Http = {
  get: (path) => call("GET", path),
  post: (path, body) => call("POST", path, body),
  patch: (path, body) => call("POST", path, body), // not used by the Notion API
  delete: (path) => call("DELETE", path),
};
const api = createNotionApi(http);

export const useNotionStatus = () => useQuery<NotionStatus>({ queryKey: qk.notion.status, queryFn: api.status, staleTime: 60_000 });

/** Sends the person to Notion's own sign-in page. They come back to Settings when it is done. */
export const useConnectNotion = () =>
  useMutation({
    mutationFn: async (opts?: { returnTo?: string }) => {
      const { url } = await api.start();
      if (opts?.returnTo) rememberConnectReturn(opts.returnTo);
      window.location.assign(url);
    },
  });

export function useDisconnectNotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.disconnect(),
    onSuccess: (status) => {
      qc.setQueryData(qk.notion.status, status);
      void qc.invalidateQueries({ queryKey: ["notion", "pages"] });
    },
  });
}

export const useNotionPages = (q: string, enabled: boolean) =>
  useInfiniteQuery({
    queryKey: qk.notion.pages(q),
    queryFn: ({ pageParam }) => api.pages(pageParam || undefined, q || undefined),
    initialPageParam: "",
    getNextPageParam: (last) => last.next ?? undefined,
    enabled,
    retry: false,
  });

const CHUNK = 20; // what the server takes in one import

/** Imports the chosen pages as notes, 20 at a time, and adds up the results. */
export function useImportNotionPages() {
  const qc = useQueryClient();
  return useMutation<NotionImportResult, Error, string[]>({
    mutationFn: async (ids) => {
      const total: NotionImportResult = { imported: 0, skipped: 0, failed: 0 };
      for (let i = 0; i < ids.length; i += CHUNK) {
        const r = await api.importPages(ids.slice(i, i + CHUNK));
        total.imported += r.imported;
        total.skipped += r.skipped;
        total.failed += r.failed;
      }
      return total;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["notion", "pages"] });
      void qc.invalidateQueries({ queryKey: qk.notes.all });
      void qc.invalidateQueries({ queryKey: qk.notes.folders });
    },
  });
}

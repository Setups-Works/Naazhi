"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createComposioApi, type Http } from "@untitled/api-client";
import type { ComposioAppId, ComposioItems, ComposioStatus } from "../../lib/composio/apps";
import { qk } from "../../lib/query/keys";

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

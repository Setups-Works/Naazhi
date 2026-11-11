"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ZohoItems, ZohoStatus } from "../../lib/zoho";
import { qk } from "../../lib/query/keys";

/**
 * Data layer for the Zoho connection (Settings) and the Zoho cards in chat. The browser only ever talks to our own /api/v1 routes;
 * the Zoho tokens never leave the server.
 */
async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const j = (await res.json().catch(() => null)) as { data?: T; error?: string } | null;
  if (!res.ok || !j || j.data === undefined) throw new Error(j?.error ?? "Couldn’t reach Zoho. Try again.");
  return j.data;
}

export const useZohoStatus = () => useQuery({ queryKey: qk.zoho.status, queryFn: () => call<ZohoStatus>("/api/v1/integrations/zoho"), staleTime: 60_000 });

/** Sends the person to Zoho's own page to approve the services they picked. */
export function useConnectZoho() {
  return useMutation({
    mutationFn: async (services: string[]) => {
      const { url } = await call<{ url: string }>("/api/v1/integrations/zoho/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ services }),
      });
      window.location.assign(url);
    },
  });
}

export function useDisconnectZoho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => call<ZohoStatus>("/api/v1/integrations/zoho", { method: "DELETE" }),
    onSuccess: (s) => {
      qc.setQueryData(qk.zoho.status, s);
      void qc.invalidateQueries({ queryKey: ["zoho", "items"] });
    },
  });
}

export const useZohoItems = (service: string, view: string, q: string) =>
  useQuery({
    queryKey: qk.zoho.items(service, view, q),
    queryFn: () => call<ZohoItems>(`/api/v1/integrations/zoho/items?${new URLSearchParams({ service, ...(view ? { view } : {}), ...(q ? { q } : {}) })}`),
    staleTime: 60_000,
    retry: false,
  });

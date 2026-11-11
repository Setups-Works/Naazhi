"use client";
import { createAiConnectionsApi } from "@untitled/api-client";
import type { AiCatalog } from "@untitled/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http, restMessage } from "../../lib/api/rest";
import { qk } from "../../lib/query/keys";

/** Data layer for the model picker's connections (own keys and the ChatGPT sign-in). Calls are shared with the phone app (packages/api-client). */
export const aiConnectionsApi = createAiConnectionsApi(http);

export const useAiCatalog = () => useQuery({ queryKey: qk.aiCatalog, queryFn: aiConnectionsApi.catalog, staleTime: 60_000 });

/** Each change answers with the fresh catalog, which replaces the cache so the picker updates at once. */
export function useAiConnectionActions(onError: (m: string) => void) {
  const qc = useQueryClient();
  const settle = {
    onSuccess: (data: AiCatalog) => qc.setQueryData(qk.aiCatalog, data),
    onError: (e: unknown) => onError(restMessage(e, "Couldn’t update that connection.")),
  };
  return {
    saveKey: useMutation({ mutationFn: (v: { provider: string; apiKey: string }) => aiConnectionsApi.saveKey(v.provider, v.apiKey), ...settle }),
    disconnect: useMutation({ mutationFn: (provider: string) => aiConnectionsApi.disconnect(provider), ...settle }),
    refresh: () => qc.invalidateQueries({ queryKey: qk.aiCatalog }),
  };
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAiConnectionsApi } from "@untitled/api-client";
import type { AiCatalog } from "@untitled/types";

import { api, errorMessage } from "@/lib/api";

/** The model picker's connections (own API keys, the ChatGPT sign-in). The same client the web uses (packages/api-client). */
export const aiConnectionsApi = createAiConnectionsApi(api);

const CATALOG = ["ai", "catalog"] as const;

export const useAiCatalog = () => useQuery({ queryKey: CATALOG, queryFn: aiConnectionsApi.catalog, staleTime: 60_000 });

/** Each change answers with the fresh catalog, which replaces the cache so the picker updates at once. */
export function useAiConnectionActions(onError: (message: string) => void) {
  const qc = useQueryClient();
  const settle = {
    onSuccess: (data: AiCatalog) => qc.setQueryData(CATALOG, data),
    onError: (e: unknown) => onError(errorMessage(e, "Couldn’t update that connection.")),
  };
  return {
    saveKey: useMutation({ mutationFn: (v: { provider: string; apiKey: string }) => aiConnectionsApi.saveKey(v.provider, v.apiKey), ...settle }),
    disconnect: useMutation({ mutationFn: (provider: string) => aiConnectionsApi.disconnect(provider), ...settle }),
    refresh: () => qc.invalidateQueries({ queryKey: CATALOG }),
  };
}

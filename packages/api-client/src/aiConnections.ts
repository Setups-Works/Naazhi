import type { AiCatalog, DeviceLoginPoll, DeviceLoginStart } from "@untitled/types";
import type { Http } from "./sharedJournals";

/** The model picker's connections API (own keys and the ChatGPT sign-in), written once for the web and the Expo app. Routes: apps/web/src/app/api/v1/ai/connections. */
type Data<T> = { data: T };
const base = "/api/v1/ai/connections";

export function createAiConnectionsApi(http: Http) {
  const unwrap = async <T>(p: Promise<Data<T>>) => (await p).data;
  return {
    catalog: () => unwrap(http.get<Data<AiCatalog>>(base)),
    saveKey: (provider: string, apiKey: string) => unwrap(http.post<Data<AiCatalog>>(`${base}/key`, { provider, apiKey })),
    disconnect: (provider: string) => unwrap(http.delete<Data<AiCatalog>>(`${base}?provider=${encodeURIComponent(provider)}`)),
    startChatgpt: () => unwrap(http.post<Data<DeviceLoginStart>>(`${base}/chatgpt/start`, {})),
    pollChatgpt: () => unwrap(http.post<Data<DeviceLoginPoll>>(`${base}/chatgpt/poll`, {})),
  };
}
export type AiConnectionsApi = ReturnType<typeof createAiConnectionsApi>;

import type { NotionImportResult, NotionPages, NotionStatus } from "@untitled/types";
import type { Http } from "./sharedJournals";

/** Notion (through Composio): connect, list pages, import them as notes. Routes: apps/web/src/app/api/v1/integrations/notion. */
type Data<T> = { data: T };
const base = "/api/v1/integrations/notion";

export function createNotionApi(http: Http) {
  const unwrap = async <T>(p: Promise<Data<T>>) => (await p).data;
  return {
    status: () => unwrap(http.get<Data<NotionStatus>>(base)),
    /** The address of Notion's own sign-in page; open it in the browser. */
    start: () => unwrap(http.post<Data<{ url: string }>>(`${base}/start`, {})),
    disconnect: () => unwrap(http.delete<Data<NotionStatus>>(base)),
    pages: (cursor?: string, q?: string) => unwrap(http.get<Data<NotionPages>>(`${base}/pages?${new URLSearchParams({ ...(cursor ? { cursor } : {}), ...(q ? { q } : {}) })}`)),
    importPages: (page_ids: string[]) => unwrap(http.post<Data<NotionImportResult>>(`${base}/import`, { page_ids })),
  };
}
export type NotionApi = ReturnType<typeof createNotionApi>;

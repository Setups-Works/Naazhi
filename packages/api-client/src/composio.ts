import type { ComposioAppId, ComposioItems, ComposioStatus } from "@untitled/types";
import type { Http } from "./sharedJournals";

/**
 * Apps connected through Composio (Gmail, Google Calendar), written once for the web and the Expo app.
 * Routes: apps/web/src/app/api/v1/integrations/composio.
 */
type Data<T> = { data: T };
const base = "/api/v1/integrations/composio";

export function createComposioApi(http: Http) {
  const unwrap = async <T>(p: Promise<Data<T>>) => (await p).data;
  return {
    status: () => unwrap(http.get<Data<ComposioStatus>>(base)),
    /** The address of the app's own sign-in page. Open it in the browser; the person comes back to Settings. */
    start: (app: ComposioAppId) => unwrap(http.post<Data<{ url: string }>>(`${base}/start`, { app })),
    disconnect: (app: ComposioAppId) => unwrap(http.delete<Data<ComposioStatus>>(`${base}?app=${encodeURIComponent(app)}`)),
    items: (app: ComposioAppId, view?: string, q?: string) =>
      unwrap(http.get<Data<ComposioItems>>(`${base}/items?${new URLSearchParams({ app, ...(view ? { view } : {}), ...(q ? { q } : {}) })}`)),
  };
}
export type ComposioApi = ReturnType<typeof createComposioApi>;

import "server-only";
import type { ComposioAppId, ComposioItems, ComposioRow } from "@untitled/types";
import { COMPOSIO_APPS } from "../../../lib/composio/apps";
import { asComposioApp } from "./connections";
import { arr, dayAndTime, dot, field, obj, str, type J } from "./json";
import { executeTool } from "./tools";

/**
 * What a chat card shows for each connected app. Read as the signed-in person with their own connection, so the app's own
 * permissions decide what they may see, and the assistant never sees any of it.
 *
 * The tool names and their arguments come from Composio's toolkit pages (docs.composio.dev/toolkits/gmail and /googlecalendar).
 * Those pages do not describe the answers, so the rows below are read defensively: a field that is missing leaves a gap in the
 * card, never an error. Check the cards against a live account once after setting Composio up (see composio/MERGE.md).
 */
const MAX_ROWS = 10;

type Run = (tool: string, args: J) => Promise<J>;
type Reader = (run: Run, view: string, query: string) => Promise<ComposioRow[]>;

/** Gmail's own search words for each list. */
const GMAIL_SEARCH: Record<string, string> = { inbox: "in:inbox", unread: "in:inbox is:unread", sent: "in:sent" };

const gmail: Reader = async (run, view, query) => {
  const data = await run("GMAIL_FETCH_EMAILS", {
    user_id: "me",
    query: [GMAIL_SEARCH[view], query].filter(Boolean).join(" "),
    max_results: MAX_ROWS,
    include_payload: false,
    verbose: false,
  });
  return arr(field(data, "messages"))
    .map(obj)
    .slice(0, MAX_ROWS)
    .map((m) => {
      const id = str(m.threadId) || str(m.messageId) || str(m.id);
      return {
        id,
        title: str(m.subject) || "(no subject)",
        subtitle: dot(str(m.sender) || str(m.from), dayAndTime(str(m.messageTimestamp))).slice(0, 200),
        url: id ? `${COMPOSIO_APPS.gmail.web}mail/#all/${encodeURIComponent(id)}` : null,
      };
    });
};

const googlecalendar: Reader = async (run, _view, query) => {
  const data = await run("GOOGLECALENDAR_EVENTS_LIST", {
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: MAX_ROWS,
    ...(query ? { query } : {}),
  });
  return arr(field(data, "items"))
    .map(obj)
    .slice(0, MAX_ROWS)
    .map((e) => {
      const start = obj(e.start);
      return {
        id: str(e.id),
        title: str(e.summary) || "(no title)",
        // A timed event has `dateTime`; one that lasts the whole day has only `date`.
        subtitle: dot(str(start.dateTime) ? dayAndTime(str(start.dateTime)) : dot(dayAndTime(str(start.date)), "all day"), str(e.location)).slice(0, 200),
        url: str(e.htmlLink) || null,
      };
    });
};

const READERS: Record<ComposioAppId, Reader> = { gmail, googlecalendar };

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The rows of one chat card. `view` picks a list (inbox, unread, upcoming…) and anything unknown falls back to the app's first;
 * `query` searches it.
 */
export async function listComposioItems(userId: string, appId: string, view?: string, query?: string): Promise<ComposioItems> {
  const app = asComposioApp(appId);
  const def = COMPOSIO_APPS[app];
  const picked = view && def.views.includes(view) ? view : def.views[0];
  const text = (query ?? "").trim().slice(0, 100);
  const rows = await READERS[app]((tool, args) => executeTool(userId, app, tool, args), picked, text);
  return { app, view: picked, title: dot(def.name, capital(picked)) + (text ? ` matching “${text}”` : ""), rows, openUrl: def.web };
}

import "server-only";
import type { ComposioAppId, ComposioItems, ComposioRow } from "@untitled/types";
import { COMPOSIO_APPS } from "../../../lib/composio/apps";
import { googleApi } from "./api";
import { asComposioApp } from "./connections";
import { arr, dayAndTime, dot, obj, str } from "./json";

/**
 * What a chat card shows for each Google app. Read as the signed-in person with their own token, so Google's own permissions decide
 * what they may see, and the assistant never sees any of it. A field that is missing leaves a gap in the card, never an error.
 */
const MAX_ROWS = 10;
const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

type Reader = (userId: string, view: string, query: string) => Promise<ComposioRow[]>;

/** Gmail's own search words for each list. */
const GMAIL_SEARCH: Record<string, string> = { inbox: "in:inbox", unread: "in:inbox is:unread", sent: "in:sent" };

const header = (m: Record<string, unknown>, name: string) =>
  str(arr(obj(m.payload).headers).map(obj).find((h) => str(h.name).toLowerCase() === name)?.value);

const gmail: Reader = async (userId, view, query) => {
  const q = [GMAIL_SEARCH[view], query].filter(Boolean).join(" ");
  const list = await googleApi(userId, "gmail", `${GMAIL}/messages?${new URLSearchParams({ q, maxResults: String(MAX_ROWS) })}`);
  const ids = arr(list.messages).map((m) => str(obj(m).id)).filter(Boolean).slice(0, MAX_ROWS);
  const meta = new URLSearchParams({ format: "metadata", fields: "id,threadId,internalDate,payload/headers" });
  for (const h of ["Subject", "From", "To"]) meta.append("metadataHeaders", h);
  const rows = await Promise.all(ids.map((id) => googleApi(userId, "gmail", `${GMAIL}/messages/${encodeURIComponent(id)}?${meta}`)));
  return rows.map((m) => {
    const id = str(m.threadId) || str(m.id);
    const when = Number(m.internalDate);
    return {
      id,
      title: header(m, "subject") || "(no subject)",
      subtitle: dot(view === "sent" ? header(m, "to") : header(m, "from"), Number.isFinite(when) ? dayAndTime(new Date(when).toISOString()) : "").slice(0, 200),
      url: id ? `${COMPOSIO_APPS.gmail.web}mail/#all/${encodeURIComponent(id)}` : null,
    };
  });
};

const googlecalendar: Reader = async (userId, _view, query) => {
  const params = new URLSearchParams({ timeMin: new Date().toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: String(MAX_ROWS) });
  if (query) params.set("q", query);
  const data = await googleApi(userId, "googlecalendar", `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`);
  return arr(data.items)
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

const KINDS: Record<string, string> = {
  "application/vnd.google-apps.document": "Doc",
  "application/vnd.google-apps.spreadsheet": "Sheet",
  "application/vnd.google-apps.presentation": "Slides",
  "application/vnd.google-apps.folder": "Folder",
  "application/pdf": "PDF",
};

const googledrive: Reader = async (userId, _view, query) => {
  const escaped = query.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const params = new URLSearchParams({
    pageSize: String(MAX_ROWS),
    orderBy: "modifiedTime desc",
    fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
    q: ["trashed = false", escaped ? `name contains '${escaped}'` : ""].filter(Boolean).join(" and "),
  });
  const data = await googleApi(userId, "googledrive", `https://www.googleapis.com/drive/v3/files?${params}`);
  return arr(data.files)
    .map(obj)
    .slice(0, MAX_ROWS)
    .map((f) => ({
      id: str(f.id),
      title: str(f.name) || "(untitled)",
      subtitle: dot(KINDS[str(f.mimeType)] ?? "File", dayAndTime(str(f.modifiedTime))).slice(0, 200),
      url: str(f.webViewLink) || null,
    }));
};

const READERS: Record<ComposioAppId, Reader> = { gmail, googlecalendar, googledrive };

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
  const rows = await READERS[app](userId, picked, text);
  return { app, view: picked, title: dot(def.name, capital(picked)) + (text ? ` matching “${text}”` : ""), rows, openUrl: def.web };
}

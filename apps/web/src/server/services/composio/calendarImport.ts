import "server-only";
import type { ImportedGoogleEvent } from "@untitled/types";
import { googleApi } from "./api";
import { arr, obj, str } from "./json";

/**
 * Reads a person's Google Calendar events so the browser can save them in the Naazhi calendar. Only the main calendar, two years back to
 * two years ahead, repeating events expanded into their occurrences. The server returns plain dates and times: turning an all-day event
 * into the person's own midnight needs their time zone, which only the browser knows (the same rule as an event made by hand).
 */
const PAGE = 250;
const MAX_EVENTS = 2500;
const YEAR_MS = 365 * 24 * 3_600_000;
const URL_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const DAY_MS = 86_400_000;

/** Google's end date of an all-day event is the day after its last day; the calendar here stores the last day. */
const dayBefore = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);

export async function listGoogleCalendarEvents(userId: string): Promise<{ events: ImportedGoogleEvent[]; truncated: boolean }> {
  const now = Date.now();
  const events: ImportedGoogleEvent[] = [];
  let pageToken = "";
  let truncated = false;
  do {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "false",
      maxResults: String(PAGE),
      timeMin: new Date(now - 2 * YEAR_MS).toISOString(),
      timeMax: new Date(now + 2 * YEAR_MS).toISOString(),
      fields: "nextPageToken,items(id,status,summary,description,location,start,end)",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await googleApi(userId, "googlecalendar", `${URL_BASE}?${params}`);
    for (const raw of arr(data.items)) {
      const e = obj(raw);
      const start = obj(e.start);
      const end = obj(e.end);
      const id = str(e.id);
      if (!id || str(e.status) === "cancelled") continue;
      if (events.length >= MAX_EVENTS) {
        truncated = true;
        break;
      }
      const allDay = Boolean(str(start.date));
      const s = allDay ? str(start.date) : str(start.dateTime);
      const t = allDay ? (str(end.date) ? dayBefore(str(end.date)) : s) : str(end.dateTime) || s;
      if (!s || Number.isNaN(Date.parse(allDay ? `${s}T00:00:00Z` : s))) continue;
      events.push({
        external_id: id.slice(0, 200),
        title: (str(e.summary).trim() || "(no title)").slice(0, 300),
        description: str(e.description).slice(0, 5000),
        location: str(e.location).slice(0, 300),
        all_day: allDay,
        start: s,
        end: t < s ? s : t,
      });
    }
    pageToken = truncated ? "" : str(data.nextPageToken);
  } while (pageToken);
  return { events, truncated };
}

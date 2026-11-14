import "server-only";
import { itemPath } from "../../../lib/chat-actions";
import { userDb } from "../../db/builders";
import { ValidationError } from "../../errors";
import { createJournalEntry } from "../../repositories/journal.repository";
import { googleApi } from "./api";
import { dayAndTime, dot, obj, str } from "./json";

/**
 * Saves one Google Calendar event as a journal entry on the day of the event. The event is read again from Google here, with the
 * person's own token, so the text comes from the real event and never from the browser or from the assistant (which can't see it).
 */
const EVENT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export async function saveEventToJournal(userId: string, eventId: string): Promise<{ id: string; entry_date: string; path: string }> {
  if (!/^[A-Za-z0-9_-]{1,1024}$/.test(eventId)) throw new ValidationError("That isn’t an event Naazhi can read.");
  const e = await googleApi(userId, "googlecalendar", `${EVENT}/${encodeURIComponent(eventId)}`);
  const start = obj(e.start);
  const end = obj(e.end);
  // The day is read from the text itself (the event's own day), never shifted into the server's time zone.
  const startText = str(start.dateTime) || str(start.date);
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(startText)?.[1];
  if (!day) throw new ValidationError("That event has no date.");
  const when = str(start.dateTime)
    ? dot(dayAndTime(str(start.dateTime)), str(end.dateTime) ? `until ${dayAndTime(str(end.dateTime)).split(", ")[1] ?? ""}`.trim() : "")
    : "All day";
  const body = [
    `${str(e.summary).trim() || "Event"}`,
    when,
    str(e.location) ? `Where: ${str(e.location)}` : "",
    str(e.description).trim().slice(0, 2000),
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 5000);
  const entry = await createJournalEntry(userDb(userId), { body, entry_date: day });
  return { id: entry.id, entry_date: entry.entry_date, path: itemPath("journal", entry.id, entry.entry_date) };
}

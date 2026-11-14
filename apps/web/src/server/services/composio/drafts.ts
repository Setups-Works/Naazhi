import "server-only";
import { gcalEventSchema, gmailSendSchema } from "../../../lib/chat-actions";
import { COMPOSIO_APPS } from "../../../lib/composio/apps";
import { ConflictError, ValidationError } from "../../errors";
import { field, str } from "./json";
import { executeTool } from "./tools";

/**
 * The things chat can do in a connected app: send an email, add a calendar event. These run only after the person pressed the
 * button on the draft card (services/ai/actions.ts). Every field is checked again here, because a draft is text the model wrote.
 */
export type Done = { id: string; url: string };

/** Sends a plain-text email from the person's own Gmail account. */
export async function sendGmail(userId: string, draft: { to: string; subject: string; body: string }): Promise<Done> {
  const mail = gmailSendSchema.safeParse({ kind: "gmail_send", ...draft });
  if (!mail.success) throw new ValidationError("That email address doesn’t look right.");
  await executeTool(userId, "gmail", "GMAIL_SEND_EMAIL", {
    user_id: "me",
    recipient_email: mail.data.to,
    subject: mail.data.subject,
    body: mail.data.body,
    // Plain text: the model's words are never interpreted as HTML.
    is_html: false,
  });
  return { id: "", url: `${COMPOSIO_APPS.gmail.web}mail/#sent` };
}

const MINUTE = 60_000;
/** A clock time on a calendar day, moved by some minutes, as the calendar wants it: "2026-11-20T10:30:00" (no time zone in the text). */
const moved = (date: string, time: string, minutes: number) => new Date(Date.parse(`${date}T${time}:00Z`) + minutes * MINUTE).toISOString().slice(0, 19);
const dayAfter = (date: string) => moved(date, "00:00", 24 * 60).slice(0, 10);

/**
 * The time zone of the person's main calendar ("Asia/Kolkata"). A clock time means nothing without it, and the server doesn't know
 * where the person is, so their own calendar is asked.
 */
async function calendarTimeZone(userId: string): Promise<string> {
  const zone = str(field(await executeTool(userId, "googlecalendar", "GOOGLECALENDAR_EVENTS_LIST", { calendarId: "primary", maxResults: 1 }), "timeZone"));
  // Without the zone the event could land hours away from what was asked, so nothing is created.
  if (!zone) throw new ConflictError("We couldn’t read your calendar’s time zone, so the event wasn’t added. Try again, or add it without a time.");
  return zone;
}

/** Adds an event to the person's main Google calendar: for the whole day, or at a time (one hour long unless an end is given). */
export async function createCalendarEvent(
  userId: string,
  draft: { title: string; date: string; start_time?: string | null; end_time?: string | null; location?: string; description?: string },
): Promise<Done> {
  const parsed = gcalEventSchema.safeParse({ kind: "gcal_event", ...draft });
  if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "That event doesn’t look right.");
  const e = parsed.data;
  const when = e.start_time
    ? {
        start_datetime: moved(e.date, e.start_time, 0),
        end_datetime: e.end_time ? moved(e.date, e.end_time, 0) : moved(e.date, e.start_time, 60),
        timezone: await calendarTimeZone(userId),
      }
    : { start_date: e.date, end_date: dayAfter(e.date) }; // the calendar's end date is the day after the last day
  const data = await executeTool(userId, "googlecalendar", "GOOGLECALENDAR_CREATE_EVENT", {
    calendar_id: "primary",
    summary: e.title,
    ...when,
    ...(e.location ? { location: e.location } : {}),
    ...(e.description ? { description: e.description } : {}),
  });
  return { id: str(field(data, "id")), url: str(field(data, "htmlLink")) || COMPOSIO_APPS.googlecalendar.web };
}

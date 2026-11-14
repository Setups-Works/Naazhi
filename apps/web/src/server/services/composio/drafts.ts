import "server-only";
import { gcalEventSchema, gmailSendSchema } from "../../../lib/chat-actions";
import { COMPOSIO_APPS } from "../../../lib/composio/apps";
import { ConflictError, ValidationError } from "../../errors";
import { str } from "./json";
import { googleApi } from "./api";

/**
 * The things chat can do in a connected app: send an email, add a calendar event. These run only after the person pressed the
 * button on the draft card (services/ai/actions.ts). Every field is checked again here, because a draft is text the model wrote.
 */
export type Done = { id: string; url: string };

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const CALENDAR = "https://www.googleapis.com/calendar/v3/calendars/primary";

/** A header value cannot hold a line break, or the model could add headers of its own (a hidden Bcc). */
const oneLine = (v: string) => v.replace(/[\r\n]+/g, " ").trim();
/** Non-ASCII text in a header is written as an encoded word (RFC 2047). */
const header = (v: string) => (/^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${Buffer.from(v, "utf8").toString("base64")}?=`);

/** Sends a plain-text email from the person's own Gmail account. */
export async function sendGmail(userId: string, draft: { to: string; subject: string; body: string }): Promise<Done> {
  const mail = gmailSendSchema.safeParse({ kind: "gmail_send", ...draft });
  if (!mail.success) throw new ValidationError("That email address doesn’t look right.");
  const raw = [
    `To: ${oneLine(mail.data.to)}`,
    `Subject: ${header(oneLine(mail.data.subject))}`,
    "MIME-Version: 1.0",
    // Plain text: the model's words are never interpreted as HTML.
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(mail.data.body, "utf8").toString("base64"),
  ].join("\r\n");
  const sent = await googleApi(userId, "gmail", `${GMAIL}/messages/send`, { method: "POST", body: { raw: Buffer.from(raw, "utf8").toString("base64url") } });
  return { id: str(sent.id), url: `${COMPOSIO_APPS.gmail.web}mail/#sent` };
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
  const zone = str((await googleApi(userId, "googlecalendar", `${CALENDAR}/events?maxResults=1&fields=timeZone`)).timeZone);
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
        start: { dateTime: moved(e.date, e.start_time, 0), timeZone: await calendarTimeZone(userId) },
        end: { dateTime: e.end_time ? moved(e.date, e.end_time, 0) : moved(e.date, e.start_time, 60) },
      }
    : { start: { date: e.date }, end: { date: dayAfter(e.date) } }; // the calendar's end date is the day after the last day
  if ("timeZone" in when.start) (when.end as { timeZone?: string }).timeZone = when.start.timeZone;
  const data = await googleApi(userId, "googlecalendar", `${CALENDAR}/events`, {
    method: "POST",
    body: {
      summary: e.title,
      ...when,
      ...(e.location ? { location: e.location } : {}),
      ...(e.description ? { description: e.description } : {}),
    },
  });
  return { id: str(data.id), url: str(data.htmlLink) || COMPOSIO_APPS.googlecalendar.web };
}

import { z } from "zod";

/**
 * The chat blocks for apps connected through Composio (Gmail, Google Calendar). They are added to the chat schemas in chatActions.ts.
 * Like every block they are only proposals: a show block makes the app read the person's own data, and a draft does nothing until
 * the person presses its button (the server then checks every field again, see apps/web/src/server/services/composio).
 */

/** The same list as COMPOSIO_APP_IDS in @untitled/types (a unit test keeps the two equal). */
export const COMPOSIO_APP_IDS = ["gmail", "googlecalendar"] as const;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** A time of day on the 24-hour clock, for example "09:30". */
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** Items from a connected app (the inbox, coming events). `view` picks the list and `query` searches it. */
export const composioShowSchema = z.object({
  kind: z.literal("composio"),
  app: z.enum(COMPOSIO_APP_IDS),
  view: z.string().trim().max(20).optional(),
  query: z.string().trim().max(100).optional(),
});

/** An email sent from the person's own Gmail account. Plain text only. */
export const gmailSendSchema = z.object({
  kind: z.literal("gmail_send"),
  to: z.string().trim().email().max(320),
  subject: z.string().trim().min(1).max(300),
  body: z.string().max(10_000),
});

/**
 * An event in the person's main Google calendar. Without a start time it lasts the whole day. An end time needs a start time and
 * must come after it; without one the event lasts an hour.
 */
export const gcalEventSchema = z
  .object({
    kind: z.literal("gcal_event"),
    title: z.string().trim().min(1).max(300),
    date,
    start_time: time.nullish(),
    end_time: time.nullish(),
    location: z.string().trim().max(300).optional(),
    description: z.string().max(5000).optional(),
  })
  .refine((e) => !e.end_time || (Boolean(e.start_time) && e.end_time > e.start_time!), "The end time must come after the start time.");

export const COMPOSIO_DRAFT_KINDS = ["gmail_send", "gcal_event"] as const;
export type ComposioDraft = z.infer<typeof gmailSendSchema> | z.infer<typeof gcalEventSchema>;

/** True for drafts that act outside Naazhi, so their card can say what will happen instead of "Create". */
export const isComposioDraft = (kind: string): kind is ComposioDraft["kind"] => (COMPOSIO_DRAFT_KINDS as readonly string[]).includes(kind);

/** "09:30–10:30", "09:30" or "all day". */
export const eventTimeLabel = (e: { start_time?: string | null; end_time?: string | null }) =>
  e.start_time ? (e.end_time ? `${e.start_time}–${e.end_time}` : e.start_time) : "all day";

/** One line for a hover card, in the style of describeItem (chatActions.ts). No quotes or brackets, so it is safe in a Markdown link title. */
export function describeComposioDraft(a: ComposioDraft): string {
  const clean = (s: string) =>
    s
      .replace(/[\r\n]+/g, " ")
      .replace(/["[\]()]/g, "")
      .trim()
      .slice(0, 80);
  return a.kind === "gmail_send" ? `Gmail · ${clean(a.subject)}` : `Google Calendar · ${clean(a.title)} · ${a.date}`;
}

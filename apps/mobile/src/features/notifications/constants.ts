/** Android notification channels: messages from admins and people (loud), and the app's own reminders (quiet). */
export const CHANNEL = { messages: "messages", reminders: "reminders" } as const;

/** When the daily reminders arrive, in the phone's local time. */
export const REMINDER_HOURS = { tasks: 8, journal: 21 } as const;

/** How long before an event starts its reminder arrives. */
export const EVENT_LEAD_MINUTES = 15;

/** Reminders are planned this many days ahead and replanned whenever the app opens. */
export const PLAN_DAYS = 7;

/** iOS keeps at most 64 pending notifications; stay well under. */
export const MAX_SCHEDULED = 50;

/** Fewest milliseconds between two replanning runs from foreground changes. */
export const REPLAN_MIN_MS = 10 * 60 * 1000;

import { planReminders, type Reminder } from "@untitled/logic";
import type { CalendarEvent, JournalEntry, ListResponse, Task } from "@untitled/types";
import * as Notifications from "expo-notifications";

import { CHANNEL, EVENT_LEAD_MINUTES, MAX_SCHEDULED, PLAN_DAYS, REMINDER_HOURS } from "./constants";
import type { NotificationPrefs } from "./prefs";
import { dbQuery } from "@/features/chat/db";
import { api } from "@/lib/api";

/** Reads what the reminders are about. A part that can't be read (offline) is left out; the rest are still planned. */
async function load() {
  const [tasks, entries, events] = await Promise.allSettled([
    api.get<ListResponse<Task>>("/api/v1/tasks?done=false&archived=false&cancelled=false&limit=200"),
    api.get<ListResponse<JournalEntry>>("/api/v1/journal?limit=200"),
    dbQuery<CalendarEvent[]>({
      table: "calendar_events",
      op: "select",
      columns: "id,title,start_at,all_day",
      order: [{ column: "start_at", ascending: true }],
      limit: 500,
    }),
  ]);
  return {
    ok: tasks.status === "fulfilled" && entries.status === "fulfilled",
    tasks: tasks.status === "fulfilled" ? tasks.value.data : [],
    entryDates: entries.status === "fulfilled" ? entries.value.data.map((e) => e.entry_date) : [],
    events: events.status === "fulfilled" ? (events.value ?? []) : [],
  };
}

async function schedule(r: Reminder) {
  await Notifications.scheduleNotificationAsync({
    content: { title: r.title, body: r.body, data: { url: r.url } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL.reminders },
  });
}

/**
 * Replaces the phone's scheduled reminders with a fresh plan from the person's current to-dos, journal and events. The wording is
 * worked out when the app runs (so it names real tasks), and the system delivers them later even if the app is closed; the next time
 * the app opens the plan is made again. Nothing is changed when the data could not be read, so one offline moment never clears them.
 */
export async function replanReminders(prefs: NotificationPrefs): Promise<void> {
  if (!prefs.enabled) {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  const data = await load();
  if (!data.ok) return;
  const plan = planReminders({
    now: Date.now(),
    tasks: data.tasks,
    entryDates: data.entryDates,
    events: data.events,
    on: { tasks: prefs.tasks, journal: prefs.journal, events: prefs.events },
    hours: REMINDER_HOURS,
    days: PLAN_DAYS,
    leadMinutes: EVENT_LEAD_MINUTES,
    max: MAX_SCHEDULED,
  });
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const r of plan) await schedule(r).catch(() => undefined);
}

export const clearReminders = () => Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);

import { remindAt } from "./tasks";
import { journalStreak } from "./widgets";

/**
 * Plans the phone's own reminders (to-dos, journal, events) from the person's data. Pure: the app hands in what it has read and
 * schedules whatever comes back, so the wording and timing are decided (and tested) here and the app only delivers them.
 */

export type ReminderKind = "tasks" | "journal" | "event";
export type Reminder = { kind: ReminderKind; at: number; title: string; body: string; url: string };

type PlanTask = {
  title: string;
  due_date: string | null;
  start_date?: string | null;
  /** Time of day to be reminded on the due date ("HH:MM"). */
  remind_time?: string | null;
  done: boolean;
  cancelled: boolean;
  archived: boolean;
};
type PlanEvent = { id: string; title: string; start_at: string; all_day: boolean };

export type ReminderInput = {
  now: number;
  tasks: PlanTask[];
  entryDates: string[];
  events: PlanEvent[];
  on: { tasks: boolean; journal: boolean; events: boolean };
  hours: { tasks: number; journal: number };
  days: number;
  leadMinutes: number;
  max: number;
};

/** A calendar day as YYYY-MM-DD in the phone's own time zone. */
const dayOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const list = (titles: string[]) => {
  const shown = titles.slice(0, 3).join(", ");
  return titles.length > 3 ? `${shown} and ${titles.length - 3} more` : shown;
};

export function planReminders(i: ReminderInput): Reminder[] {
  const out: Reminder[] = [];
  const todayIso = dayOf(new Date(i.now));
  const open = i.tasks.filter((t) => !t.done && !t.cancelled && !t.archived && t.due_date);

  // A to-do with its own reminder time is reminded at exactly that time, by name.
  if (i.on.tasks) {
    const horizon = i.now + i.days * 86_400_000;
    for (const t of open) {
      const at = remindAt(t);
      if (at !== null && at > i.now && at <= horizon) out.push({ kind: "tasks", at, title: t.title, body: "Reminder for your to-do", url: "/todo" });
    }
  }

  for (let d = 0; d < i.days; d++) {
    const base = new Date(i.now);
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + d);
    const iso = dayOf(base);

    if (i.on.tasks) {
      const at = new Date(base).setHours(i.hours.tasks, 0, 0, 0);
      // Everything due that day, plus what is still overdue (it stays on the list until it is done).
      const due = open.filter((t) => t.due_date === iso || t.due_date! < iso);
      if (at > i.now && due.length) {
        out.push({
          kind: "tasks",
          at,
          title: due.length === 1 ? "1 to-do for today" : `${due.length} to-dos for today`,
          body: list(due.map((t) => t.title)),
          url: "/todo",
        });
      }
    }

    if (i.on.journal) {
      const at = new Date(base).setHours(i.hours.journal, 0, 0, 0);
      const written = i.entryDates.includes(iso);
      if (at > i.now && !written) {
        const streak = d === 0 ? journalStreak(i.entryDates, todayIso) : 0;
        out.push({
          kind: "journal",
          at,
          title: "Time to write today’s entry",
          body: streak > 0 ? `Keep your ${streak}-day streak going.` : "Take a minute to write down how today went.",
          url: "/journal?new=1",
        });
      }
    }
  }

  if (i.on.events) {
    const horizon = i.now + i.days * 86_400_000;
    for (const ev of i.events) {
      const start = new Date(ev.start_at).getTime();
      if (Number.isNaN(start) || start <= i.now || start > horizon) continue;
      if (ev.all_day) {
        const at = new Date(start).setHours(i.hours.tasks, 0, 0, 0);
        if (at > i.now) out.push({ kind: "event", at, title: ev.title, body: "All day today", url: "/workspace" });
      } else {
        const at = start - i.leadMinutes * 60_000;
        if (at > i.now)
          out.push({
            kind: "event",
            at,
            title: ev.title,
            body: `Starts in ${i.leadMinutes} minutes`,
            url: "/workspace",
          });
      }
    }
  }

  return out.sort((a, b) => a.at - b.at).slice(0, i.max);
}

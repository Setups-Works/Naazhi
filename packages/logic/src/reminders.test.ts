import { describe, expect, it } from "vitest";
import { planReminders, type ReminderInput } from "./reminders";

const task = (title: string, due: string | null, over: Partial<{ done: boolean }> = {}) => ({ title, due_date: due, done: false, cancelled: false, archived: false, ...over });
// 10 Nov 2026, 10:00 local: after the 8:00 to-do reminder, before the 21:00 journal one.
const now = new Date(2026, 10, 10, 10, 0, 0).getTime();
const base: ReminderInput = {
  now,
  tasks: [],
  entryDates: [],
  events: [],
  on: { tasks: true, journal: true, events: true },
  hours: { tasks: 8, journal: 21 },
  days: 3,
  leadMinutes: 15,
  max: 50,
};

describe("planReminders", () => {
  it("skips times already past and counts overdue to-dos on every day", () => {
    const r = planReminders({ ...base, tasks: [task("Pay rent", "2026-11-09"), task("Call mum", "2026-11-11")] });
    const tasks = r.filter((x) => x.kind === "tasks");
    expect(tasks).toHaveLength(2); // today 8:00 has passed: the 11th and 12th remain
    expect(tasks[0]!.title).toBe("2 to-dos for today"); // Pay rent is overdue, Call mum is due the 11th
    expect(tasks[0]!.body).toBe("Pay rent, Call mum");
    expect(tasks[1]!.body).toBe("Pay rent, Call mum"); // both are still open (and overdue) on the 12th
  });

  it("does not remind about finished to-dos", () => {
    expect(planReminders({ ...base, tasks: [task("Done", "2026-11-11", { done: true })] }).filter((x) => x.kind === "tasks")).toEqual([]);
  });

  it("skips tonight's journal reminder once an entry exists and mentions the streak otherwise", () => {
    const written = planReminders({ ...base, entryDates: ["2026-11-10"] }).filter((x) => x.kind === "journal");
    expect(written).toHaveLength(2);
    const streak = planReminders({ ...base, entryDates: ["2026-11-09", "2026-11-08"] }).filter((x) => x.kind === "journal");
    expect(streak[0]!.body).toBe("Keep your 2-day streak going.");
  });

  it("reminds before an event starts and ignores past ones", () => {
    const events = [
      { id: "a", title: "Dentist", start_at: new Date(2026, 10, 10, 15, 0).toISOString(), all_day: false },
      { id: "b", title: "Old", start_at: new Date(2026, 10, 10, 9, 0).toISOString(), all_day: false },
    ];
    const r = planReminders({ ...base, events }).filter((x) => x.kind === "event");
    expect(r).toHaveLength(1);
    expect(r[0]!.at).toBe(new Date(2026, 10, 10, 14, 45).getTime());
  });

  it("respects the switches and the maximum", () => {
    expect(planReminders({ ...base, on: { tasks: false, journal: false, events: false } })).toEqual([]);
    expect(planReminders({ ...base, days: 7, max: 2 })).toHaveLength(2);
  });
});

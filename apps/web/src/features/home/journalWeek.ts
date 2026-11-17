import { addDays } from "@untitled/logic/dates";

export type WeekDay = { date: string; wrote: boolean; today: boolean };

/**
 * The last seven days ending today, each marked if it has a journal entry, and the streak: days in a row with an entry, counted back
 * from today (or from yesterday, so a streak isn't shown as broken before you've written today). Pure, so it is unit-tested.
 */
export function journalWeek(entryDates: readonly string[], today: string): { days: WeekDay[]; streak: number } {
  const wrote = new Set(entryDates);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, wrote: wrote.has(date), today: date === today };
  });
  let streak = 0;
  let day = wrote.has(today) ? today : addDays(today, -1);
  while (wrote.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return { days, streak };
}

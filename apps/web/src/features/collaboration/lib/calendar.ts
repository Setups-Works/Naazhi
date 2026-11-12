import { addDays } from "../../../lib/dates";

/** Date helpers for the shared journal's Day, Calendar and All entries views (the same maths the personal journal does inline). */

/** "2026-11-12" as a local Date at midnight. */
export const parseDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d);
};

/** "2026-11" moved by whole months. */
export const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y!, m! - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** A month as whole weeks, Monday first, with the neighbouring months' days filling the edges. */
export function monthGrid(month: string): string[] {
  const first = `${month}-01`;
  const start = parseDay(first);
  const lead = (start.getDay() + 6) % 7;
  const length = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  return Array.from({ length: Math.ceil((lead + length) / 7) * 7 }, (_, i) => addDays(first, i - lead));
}

/** Consecutive days with writing counted back from today (yesterday still counts while today is empty). */
export function streakOf(counts: Record<string, number>, today: string) {
  let streak = 0;
  for (let iso = (counts[today] ?? 0) > 0 ? today : addDays(today, -1); (counts[iso] ?? 0) > 0; iso = addDays(iso, -1)) streak++;
  return streak;
}

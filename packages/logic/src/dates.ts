/** Local-time YYYY-MM-DD (not UTC), so "today" matches the user's own calendar. */
export const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDate(new Date(y, m - 1, d + n));
};

/**
 * A sentence for the assistant's prompt that says what today is and lists the next three weeks with their weekday names, so it
 * can resolve "next Tuesday", "this Friday" or "in two weeks" by lookup instead of arithmetic (which language models get wrong).
 */
export function calendarFor(today: string) {
  const name = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long" });
  };
  const next = Array.from({ length: 21 }, (_, i) => addDays(today, i + 1)).map((iso) => `${name(iso)} ${iso}`);
  return `Today is ${name(today)} ${today} (the user's local date). The coming days: ${next.join(", ")}. Always take dates from this list when the user names a weekday or a relative day.`;
}

export const greeting = (d = new Date()) => {
  const h = d.getHours();
  return h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/**
 * A timestamp from the API as a Date. Accepts ISO-8601 and also Postgres' own text form ("2026-11-10 07:50:43.123456+00", with a space,
 * more than three fraction digits and an hours-only offset), which the phone's JavaScript engine refuses to read and turns into
 * "Invalid Date". Plain `YYYY-MM-DD` days are left alone.
 */
export function toDate(value: string | number | Date): Date {
  if (typeof value !== "string") return new Date(value);
  const text = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(text)) return new Date(text);
  return new Date(
    text
      .replace(" ", "T")
      .replace(/(\.\d{3})\d+/, "$1")
      .replace(/([+-]\d{2})$/, "$1:00"),
  );
}

export function ago(iso: string) {
  const date = toDate(iso);
  const s = (Date.now() - date.getTime()) / 1000;
  if (Number.isNaN(s)) return "";
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Whole days from a to b (both YYYY-MM-DD). */
export const daysBetween = (a: string, b: string) => {
  const t = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86_400_000);
};

export const dayLabel = (iso: string, today = isoDate()) => {
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

export const fromIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** The 6 weeks (42 days, as YYYY-MM-DD) that cover a month in a calendar grid; `weekStart` 0 = Sunday, 1 = Monday. */
export function monthGrid(year: number, month: number, weekStart: 0 | 1 = 0): string[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  return Array.from({ length: 42 }, (_, i) => isoDate(new Date(year, month, 1 - offset + i)));
}

/** "Oct 20 – 24" for a task that spans days within a month, "Oct 30 – Nov 2" across months; the plain day label with no start date. */
export const rangeLabel = (start: string | null | undefined, end: string, today = isoDate()) => {
  if (!start || start === end) return dayLabel(end, today);
  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, o);
  const same = start.slice(0, 7) === end.slice(0, 7);
  return `${fmt(start, { month: "short", day: "numeric" })} – ${same ? fmt(end, { day: "numeric" }) : fmt(end, { month: "short", day: "numeric" })}`;
};

/**
 * Small helpers for reading what a tool returned. A tool's answer is whatever the outside app sent, so nothing about its shape is
 * trusted: every value is read through one of these and a missing or odd value becomes an empty one instead of a crash.
 */
export type J = Record<string, unknown>;

export const obj = (v: unknown): J => (v && typeof v === "object" && !Array.isArray(v) ? (v as J) : {});
export const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

/** Joins the parts that are not empty with a middle dot: dot("Ada", "", "3 Nov") → "Ada · 3 Nov". */
export const dot = (...parts: (string | undefined | null)[]) => parts.filter(Boolean).join(" · ");

/** A field of a tool's answer. Some tools put their answer one level down, under `response_data` or `data`. */
export const field = (data: J, key: string): unknown => data[key] ?? obj(data.response_data)[key] ?? obj(data.data)[key];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * "2026-11-20T14:30:00+05:30" → "20 Nov 2026, 14:30"; "2026-11-20" → "20 Nov 2026". Read from the text itself, so the time shown
 * is the one the app sent and is never shifted into the server's time zone.
 */
export function dayAndTime(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(iso);
  if (!m) return "";
  const day = `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? ""} ${m[1]}`;
  return m[4] ? `${day}, ${m[4]}:${m[5]}` : day;
}

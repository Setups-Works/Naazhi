"use client";
import { useState, type ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faCalendarDay, faChevronLeft, faChevronRight, faRotate, faSun } from "@fortawesome/free-solid-svg-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { addDays } from "../../../lib/dates";
import { weekdayIndex, weekdayLabels } from "../../../lib/prefs";

const wd = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short" });
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * The date picker (reference: todo-02): quick picks with the weekday on the right, a month grid, and Clear date / Done.
 * `children` is the button that opens it. Picking a day applies it at once; Done only closes.
 */
export default function DatePopover({
  value,
  start = null,
  today,
  onChange,
  onRange,
  children,
  align = "start",
}: {
  /** The day, or the last day of a range. */
  value: string | null;
  /** The first day of a range (null for a single day). */
  start?: string | null;
  today: string;
  onChange: (date: string | null) => void;
  /** When given, the popover offers "Date range": the first day and the last day. */
  onRange?: (start: string, end: string) => void;
  children: ReactNode;
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"date" | "range">(start ? "range" : "date");
  // In range mode the first click is remembered here until the second one picks the other end.
  const [anchor, setAnchor] = useState<string | null>(null);
  const base = value ?? today;
  const [view, setView] = useState({ y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 });
  const dow = new Date(`${today}T00:00:00`).getDay();
  const picks: [string, string, typeof faSun][] = [
    ["Today", today, faCalendarDay],
    ["Tomorrow", addDays(today, 1), faSun],
    ["This weekend", addDays(today, (6 - dow + 7) % 7 || 7), faCalendarDay],
    ["Next week", addDays(today, (8 - dow) % 7 || 7), faRotate],
  ];

  const first = new Date(view.y, view.m, 1);
  const lead = weekdayIndex(first);
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => iso(view.y, view.m, i + 1))];
  const shift = (n: number) => {
    const d = new Date(view.y, view.m + n, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const pick = (d: string | null) => {
    if (mode === "range" && onRange && d) {
      if (!anchor) return setAnchor(d);
      onRange(anchor < d ? anchor : d, anchor < d ? d : anchor);
      setAnchor(null);
      return;
    }
    onChange(d);
    if (d) setView({ y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)) - 1 });
  };
  const monday = addDays(today, -((dow + 6) % 7));
  const rangePicks: [string, string, string][] = [
    ["This week", monday, addDays(monday, 6)],
    ["Next 7 days", today, addDays(today, 6)],
    ["Next week", addDays(monday, 7), addDays(monday, 13)],
  ];
  const lo = anchor ?? start;
  const hi = anchor ? null : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="dp w-[282px] p-0" onOpenAutoFocus={(e) => e.preventDefault()}>
        {onRange && (
          <div className="dp-seg" role="group" aria-label="Date or date range">
            {(["date", "range"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={mode === k}
                onClick={() => {
                  setMode(k);
                  setAnchor(null);
                }}
              >
                {k === "date" ? "Date" : "Date range"}
              </button>
            ))}
          </div>
        )}
        {mode === "range" && onRange ? (
          <ul className="dp-picks">
            {rangePicks.map(([label, a, b]) => (
              <li key={label}>
                <button type="button" data-on={start === a && value === b} onClick={() => onRange(a, b)}>
                  <FA icon={faCalendarDay} /> <span>{label}</span> <small>{wd(a)}–{wd(b)}</small>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="dp-picks">
            {picks.map(([label, d, icon]) => (
              <li key={label}>
                <button type="button" data-on={value === d && !start} onClick={() => pick(d)}>
                  <FA icon={icon} /> <span>{label}</span> <small>{wd(d)}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="dp-month">
          <b>{first.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</b>
          <span>
            <button type="button" aria-label="Previous month" onClick={() => shift(-1)}>
              <FA icon={faChevronLeft} />
            </button>
            <button type="button" aria-label="Next month" onClick={() => shift(1)}>
              <FA icon={faChevronRight} />
            </button>
          </span>
        </div>
        <div className="dp-grid" role="grid">
          {weekdayLabels("short").map((w) => (
            <span key={w} className="dp-dow">
              {w.slice(0, 2)}
            </span>
          ))}
          {cells.map((c, i) =>
            c ? (
              <button
                key={c}
                type="button"
                className="dp-day"
                data-on={c === value || c === lo}
                data-in={mode === "range" && !!lo && !!hi && c > lo && c < hi}
                data-today={c === today}
                onClick={() => pick(c)}
              >
                {Number(c.slice(8))}
              </button>
            ) : (
              <span key={`b${i}`} />
            ),
          )}
        </div>
        {mode === "range" && onRange && <p className="dp-hint">{anchor ? "Now pick the last day" : "Pick the first day, then the last"}</p>}
        <div className="dp-foot">
          <button type="button" onClick={() => pick(null)}>
            Clear date
          </button>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

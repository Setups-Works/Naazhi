"use client";
import { useRef, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faBell, faCalendarDay, faChevronDown, faFlag, faInbox, faRotate, faXmark } from "@fortawesome/free-solid-svg-icons";
import Menu, { MenuRadioGroup, MenuRadioItem } from "../../ui/Menu";
import DatePopover from "./DatePopover";
import ListPicker from "./ListPicker";
import { PRIORITIES, emptyDraft, recurrenceChoices, firstDue, type Draft } from "../../../lib/tasks";
import { addDays, dayLabel, isoDate, rangeLabel } from "../../../lib/dates";
import type { TaskList } from "../../../lib/workspace";

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Reads "Call the bank tomorrow at 4pm p2" for a date word, a priority (p1–p4; p5 is none) and a repeat, and returns the name without them. */
export function parseQuick(text: string, today: string): { title: string; due?: string; priority?: Draft["priority"]; recurrence?: string } {
  let title = ` ${text} `;
  const out: ReturnType<typeof parseQuick> = { title: "" };
  const take = (re: RegExp, f: (m: RegExpExecArray) => void) => {
    const m = re.exec(title);
    if (!m) return;
    f(m);
    title = title.replace(m[0], " ");
  };
  take(/\sp([1-5])(?=\s)/i, (m) => (out.priority = Number(m[1]) as Draft["priority"]));
  take(/\severy (day|weekday|week|month|year)(?=\s)/i, (m) => {
    out.recurrence = { day: "daily", weekday: "weekdays", week: "weekly", month: "monthly", year: "yearly" }[m[1].toLowerCase()];
  });
  take(/\s(today|tomorrow|tonight)(?=\s)/i, (m) => (out.due = m[1].toLowerCase() === "tomorrow" ? addDays(today, 1) : today));
  take(/\snext week(?=\s)/i, () => {
    const dow = new Date(`${today}T00:00:00`).getDay();
    out.due = addDays(today, ((8 - dow) % 7) || 7);
  });
  take(/\s(?:on )?(sun|mon|tue|wed|thu|fri|sat)[a-z]*(?=\s)/i, (m) => {
    const dow = new Date(`${today}T00:00:00`).getDay();
    out.due = addDays(today, ((DAYS.indexOf(m[1].toLowerCase()) - dow + 7) % 7) || 7);
  });
  // A trailing time ("at 4pm") is dropped from the name; tasks keep a date only.
  take(/\sat \d{1,2}(:\d{2})?\s?(am|pm)?(?=\s)/i, () => undefined);
  out.title = title.replace(/\s+/g, " ").trim();
  return out;
}

/** The always-open task composer at the top of a list: one line with natural-language hints, chips for the rest. */
export default function QuickAdd({
  lists,
  defaults,
  today,
  onAdd,
  onCreateList,
  inputRef,
}: {
  lists: TaskList[];
  defaults: Partial<Draft>;
  today: string;
  onAdd: (d: Draft) => unknown;
  /** Make a list with this name and resolve to its id (for the list picker). */
  onCreateList: (name: string) => Promise<string | undefined>;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [text, setText] = useState("");
  const [over, setOver] = useState<Partial<Draft>>({});
  const [busy, setBusy] = useState(false);
  const own = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? own;

  const parsed = parseQuick(text, today);
  const due = over.due_date !== undefined ? over.due_date : (parsed.due ?? defaults.due_date ?? null);
  const startDate = over.start_date !== undefined ? over.start_date : (defaults.start_date ?? null);
  const priority = over.priority ?? parsed.priority ?? defaults.priority ?? 5;
  const recurrence = over.recurrence !== undefined ? over.recurrence : (parsed.recurrence ?? defaults.recurrence ?? null);
  const listId = over.list_id !== undefined ? over.list_id : (defaults.list_id ?? null);
  const list = lists.find((l) => l.id === listId);
  const name = parsed.title;
  const set = (p: Partial<Draft>) => setOver((o) => ({ ...o, ...p }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || busy) return;
    setBusy(true);
    await onAdd(
      emptyDraft({
        ...defaults,
        title: name,
        due_date: recurrence ? firstDue(due, recurrence, today) : due,
        start_date: due && !recurrence ? startDate : null,
        priority,
        recurrence,
        list_id: listId,
      }),
    );
    setText("");
    setOver({});
    setBusy(false);
    ref.current?.focus();
  }

  return (
    <form className="qa" onSubmit={submit}>
      <input
        ref={ref}
        className="qa-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Try: Call the bank tomorrow at 4pm p2"
        maxLength={300}
        aria-label="New task"
      />
      <div className="qa-row">
        <div className="qa-chips">
          {due ? (
            <span className="qa-chip" data-set data-late={due < today || undefined}>
              <DatePopover value={due} start={startDate} today={today} onChange={(d) => set({ due_date: d, start_date: null })} onRange={(from, to) => set({ start_date: from, due_date: to, recurrence: null })}>
                <button type="button" className="qa-chip-btn" aria-label="Change date">
                  <FA icon={faCalendarDay} /> {rangeLabel(startDate, due, today)}
                </button>
              </DatePopover>
              <button type="button" aria-label="Clear date" onClick={() => set({ due_date: null, start_date: null })}>
                <FA icon={faXmark} />
              </button>
            </span>
          ) : (
            <DatePopover value={null} today={today} onChange={(d) => set({ due_date: d, start_date: null })} onRange={(from, to) => set({ start_date: from, due_date: to, recurrence: null })}>
              <button type="button" className="qa-chip" aria-label="Pick a date">
                <FA icon={faCalendarDay} /> Date
              </button>
            </DatePopover>
          )}
          <Menu
            label="Priority"
            align="start"
            trigger={<><FA icon={faFlag} /> {priority < 5 ? PRIORITIES[priority - 1].label : "Priority"}</>}
            className="qa-pop"
          >
            <MenuRadioGroup value={String(priority)} onValueChange={(v) => set({ priority: Number(v) as Draft["priority"] })}>
              <MenuRadioItem value="5">
                <span className="qa-opt">
                  <FA icon={faFlag} /> None
                </span>
              </MenuRadioItem>
              {PRIORITIES.filter((p) => p.p < 5).map((p) => (
                <MenuRadioItem key={p.p} value={String(p.p)}>
                  <span className="qa-opt">
                    <FA icon={faFlag} /> {p.label} <kbd>{p.p}</kbd>
                  </span>
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </Menu>
          <span className="qa-chip" data-off aria-disabled="true" title="Reminders are coming soon">
            <FA icon={faBell} /> Reminders
          </span>
          <Menu
            label="Repeat"
            align="start"
            trigger={<><FA icon={faRotate} /> {recurrence ? (recurrenceChoices(due, recurrence).find(([v]) => v === recurrence)?.[1] ?? "Repeat") : "Repeat"}</>}
            className="qa-pop"
          >
            <MenuRadioGroup value={recurrence ?? ""} onValueChange={(v) => set({ recurrence: v || null })}>
              {recurrenceChoices(due, recurrence).map(([v, l]) => (
                <MenuRadioItem key={v} value={v}>
                  {l}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </Menu>
        </div>
        <ListPicker lists={lists} value={listId} onChange={(id) => set({ list_id: id })} onCreate={onCreateList}>
          <button type="button" className="qa-chip" aria-label="Choose a list">
            <FA icon={faInbox} /> {list?.name ?? "Inbox"} <FA icon={faChevronDown} />
          </button>
        </ListPicker>
        {name ? (
          <button className="btn btn-primary btn-sm" disabled={busy}>
            Add task
          </button>
        ) : (
          <span className="qa-hint">
            Press <kbd>Q</kbd> to add
          </span>
        )}
      </div>
    </form>
  );
}

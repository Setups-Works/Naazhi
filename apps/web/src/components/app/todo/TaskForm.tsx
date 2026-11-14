"use client";
import { useEffect, useRef, useState } from "react";
import { readText, writeText } from "../../../lib/drafts";
import { Icon as FA } from "@/components/ui/Icon";
import { faBell, faCalendarDay, faChevronDown, faFlag, faInbox, faRotate, faXmark } from "@fortawesome/free-solid-svg-icons";
import { PRIORITIES, REMINDER_TIMES, clockLabel, clockOf, firstDue, recurrenceChoices, type Draft } from "../../../lib/tasks";
import { isoDate, rangeLabel } from "../../../lib/dates";
import type { TaskList } from "../../../lib/workspace";
import Menu, { MenuRadioGroup, MenuRadioItem } from "../../ui/Menu";
import DatePopover from "./DatePopover";
import ListPicker from "./ListPicker";

/** Used for quick add, inline add and editing. */
export default function TaskForm({
  initial,
  lists,
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus = true,
  draftKey,
  onCreateList,
}: {
  initial: Draft;
  lists: TaskList[];
  submitLabel: string;
  onSubmit: (d: Draft) => void | Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
  /** For "new task" forms: keeps the typed name and description in this browser until the task is added, so a refresh doesn't lose them. */
  draftKey?: string;
  /** Make a list with this name and resolve to its id (for "type a name" in the list picker). */
  onCreateList?: (name: string) => Promise<string | undefined>;
}) {
  const [d, setD] = useState<Draft>(() => {
    if (!draftKey) return initial;
    try {
      const s = JSON.parse(readText(draftKey) ?? "null") as { title?: unknown; description?: unknown } | null;
      return s ? { ...initial, title: String(s.title ?? ""), description: String(s.description ?? "") } : initial;
    } catch {
      return initial;
    }
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const today = isoDate();
  const sent = useRef(false);
  const desc = useRef<HTMLTextAreaElement>(null);

  // The description grows with its text (up to a limit, then scrolls) so a list or a long note is readable without hunting for it.
  useEffect(() => {
    const el = desc.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [d.description]);

  useEffect(() => {
    if (!draftKey || sent.current) return;
    writeText(draftKey, d.title || d.description ? JSON.stringify({ title: d.title, description: d.description }) : "");
  }, [draftKey, d.title, d.description]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!d.title.trim() || busy) return;
    setBusy(true);
    await onSubmit({
      ...d,
      title: d.title.trim(),
      description: d.description.trim(),
      due_date: d.recurrence ? firstDue(d.due_date, d.recurrence, today) : d.due_date,
      // A range needs an end date and cannot repeat.
      start_date: d.due_date && !d.recurrence ? (d.start_date ?? null) : null,
    });
    if (draftKey) {
      sent.current = true;
      writeText(draftKey, "");
    }
    setBusy(false);
  }

  return (
    <form
      className="tf"
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Escape" && onCancel) {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <input
        className="tf-title"
        value={d.title}
        onChange={(e) => set("title", e.target.value)}
        placeholder="Task name"
        maxLength={300}
        autoFocus={autoFocus}
        aria-label="Task name"
      />
      <textarea
        ref={desc}
        className="tf-desc"
        value={d.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder="Description"
        rows={2}
        maxLength={5000}
        aria-label="Description"
      />
      <div className="tf-chips">
        {d.due_date ? (
          <span className="qa-chip" data-set data-late={d.due_date < today || undefined}>
            <DatePopover
              value={d.due_date}
              start={d.start_date ?? null}
              today={today}
              onChange={(x) => setD((v) => ({ ...v, due_date: x, start_date: null }))}
              onRange={(from, to) => setD((v) => ({ ...v, start_date: from, due_date: to, recurrence: null, remind_time: from ? null : v.remind_time }))}
            >
              <button type="button" className="qa-chip-btn" aria-label="Change date">
                <FA icon={faCalendarDay} /> {rangeLabel(d.start_date, d.due_date, today)}
              </button>
            </DatePopover>
            <button type="button" aria-label="Clear date" onClick={() => setD((v) => ({ ...v, due_date: null, start_date: null, remind_time: null }))}>
              <FA icon={faXmark} />
            </button>
          </span>
        ) : (
          <DatePopover
            value={null}
            today={today}
            onChange={(x) => setD((v) => ({ ...v, due_date: x, start_date: null }))}
            onRange={(from, to) => setD((v) => ({ ...v, start_date: from, due_date: to, recurrence: null, remind_time: from ? null : v.remind_time }))}
          >
            <button type="button" className="qa-chip" aria-label="Pick a date">
              <FA icon={faCalendarDay} /> Date
            </button>
          </DatePopover>
        )}
        <Menu
          label="Priority"
          align="start"
          trigger={<><FA icon={faFlag} /> {d.priority < 5 ? PRIORITIES[d.priority - 1].label : "Priority"}</>}
          className="qa-pop"
        >
          <MenuRadioGroup value={String(d.priority)} onValueChange={(v) => set("priority", Number(v) as Draft["priority"])}>
            <MenuRadioItem value="5">None</MenuRadioItem>
            {PRIORITIES.filter((p) => p.p < 5).map((p) => (
              <MenuRadioItem key={p.p} value={String(p.p)}>
                {p.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </Menu>
        {/* A reminder is "on the due date at this time", so it needs a single day. */}
        {d.due_date && !d.start_date ? (
          <label className="qa-chip" data-set={d.remind_time ? "" : undefined}>
            <FA icon={faBell} />
            <select
              className="bg-transparent text-inherit outline-none"
              value={clockOf(d.remind_time) ?? ""}
              onChange={(e) => set("remind_time", e.target.value || null)}
              aria-label="Reminder time"
            >
              <option value="">Remind me</option>
              {REMINDER_TIMES.map((t) => (
                <option key={t} value={t}>
                  {clockLabel(t)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="qa-chip" data-off aria-disabled="true" title="Pick a single day to set a reminder">
            <FA icon={faBell} /> Remind me
          </span>
        )}
        <Menu
          label="Repeat"
          align="start"
          trigger={<><FA icon={faRotate} /> {d.recurrence ? (recurrenceChoices(d.due_date, d.recurrence).find(([v]) => v === d.recurrence)?.[1] ?? "Repeat") : "Repeat"}</>}
          className="qa-pop"
        >
          <MenuRadioGroup
            value={d.recurrence ?? ""}
            // A repeating to-do needs a first day, so choosing a repeat without a date starts it today (or on the next matching day).
            onValueChange={(v) =>
              setD((x) => {
                const recurrence = v || null;
                return { ...x, recurrence, start_date: recurrence ? null : x.start_date, due_date: x.due_date ?? firstDue(null, recurrence, today) };
              })
            }
          >
            {recurrenceChoices(d.due_date, d.recurrence).map(([v, l]) => (
              <MenuRadioItem key={v} value={v}>
                {l}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </Menu>
      </div>
      <div className="tf-foot">
        <ListPicker lists={lists} value={d.list_id} onChange={(id) => set("list_id", id)} onCreate={onCreateList ?? (async () => undefined)}>
          <button type="button" className="qa-chip" aria-label="Choose a list">
            <FA icon={faInbox} /> {lists.find((l) => l.id === d.list_id)?.name ?? "Inbox"} <FA icon={faChevronDown} />
          </button>
        </ListPicker>
        <span className="tf-acts">
          {onCancel && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="btn btn-primary btn-sm" disabled={!d.title.trim() || busy}>
            {submitLabel}
          </button>
        </span>
      </div>
    </form>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faBell,
  faBoxArchive,
  faCalendarDay,
  faCheck,
  faChevronDown,
  faChevronUp,
  faChevronRight,
  faCircleCheck,
  faClone,
  faEllipsis,
  faFlag,
  faInbox,
  faLink,
  faListUl,
  faPlus,
  faRotate,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { Task, TaskList } from "../../../lib/workspace";
import DatePopover from "./DatePopover";
import { rangeLabel } from "../../../lib/dates";
import { PRIORITIES, REMINDER_TIMES, clockLabel, clockOf, recurrenceChoices, recurrenceLabel, firstDue, type Draft } from "../../../lib/tasks";
import { addDays, dayLabel } from "../../../lib/dates";
import Modal from "../../ui/Modal";
import Menu, { MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "../../ui/Menu";

const PRIORITY_NAME: Record<number, string> = { 1: "Urgent", 2: "High", 3: "Medium", 4: "Low", 5: "None" };

/**
 * A task's details in a panel on the right (reference: todo-09): the title with its checkbox, a list of properties that each
 * change in place, the description, and the sub-tasks. Every change is saved straight away; there is no Save button.
 */
export default function TaskPanel({
  task: t,
  lists,
  subtasks,
  today,
  onPatch,
  onToggle,
  onDelete,
  onDuplicate,
  onNew,
  onAddSub,
  onDeleteSub,
  onClose,
}: {
  task: Task;
  lists: TaskList[];
  subtasks: Task[];
  today: string;
  onPatch: (id: string, changes: Partial<Task>) => void;
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
  onDuplicate: (t: Task) => void;
  /** Opens the add-task form filled in like this task ("Add task above / below"). */
  onNew?: (defaults: Partial<Draft>) => void;
  onAddSub: (title: string) => unknown;
  onDeleteSub: (t: Task) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(t.title);
  const [desc, setDesc] = useState(t.description);
  const [subsOpen, setSubsOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [sub, setSub] = useState("");
  const [copied, setCopied] = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const list = lists.find((l) => l.id === t.list_id);
  const late = !!t.due_date && t.due_date < today && !t.done;
  const status = t.cancelled ? "Cancelled" : t.done ? "Completed" : "Pending";
  const dow = new Date(`${today}T00:00:00`).getDay();

  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [desc]);

  const saveTitle = () => {
    const v = title.trim();
    if (v && v !== t.title) onPatch(t.id, { title: v.slice(0, 300) });
    else setTitle(t.title);
  };
  const saveDesc = () => {
    if (desc !== t.description) onPatch(t.id, { description: desc.slice(0, 5000) });
  };
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/dashboard/todo?task=${t.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  const row = (icon: typeof faFlag, label: string, value: React.ReactNode) => (
    <>
      <dt>
        <FA icon={icon} /> {label}
      </dt>
      <dd>{value}</dd>
    </>
  );

  return (
    <Modal label={`Task: ${t.title}`} onClose={onClose} size="side">
      <div className="tp">
        <div className="tp-top">
          <span className="tp-crumb">
            <FA icon={faCircleCheck} /> Task · <FA icon={list ? faListUl : faInbox} /> {list?.name ?? "Inbox"}
          </span>
          <span className="tp-tools">
            <button type="button" aria-label={copied ? "Link copied" : "Copy link"} title="Copy link" onClick={copyLink}>
              <FA icon={copied ? faCheck : faLink} />
            </button>
            <Menu label="Task options" trigger={<FA icon={faEllipsis} />}>
              {onNew && (
                <>
                  <MenuItem onSelect={() => onNew({ due_date: t.due_date, list_id: t.list_id, priority: t.priority })}>
                    <span>
                      <FA icon={faChevronUp} /> Add task above
                    </span>
                  </MenuItem>
                  <MenuItem onSelect={() => onNew({ due_date: t.due_date, list_id: t.list_id, priority: t.priority })}>
                    <span>
                      <FA icon={faChevronDown} /> Add task below
                    </span>
                  </MenuItem>
                  <MenuSeparator />
                </>
              )}
              <MenuItem onSelect={() => onDuplicate(t)}>
                <span>
                  <FA icon={faClone} /> Duplicate
                </span>
              </MenuItem>
              <MenuItem onSelect={copyLink}>
                <span>
                  <FA icon={faLink} /> Copy link
                </span>
              </MenuItem>
              <MenuSeparator />
              <MenuLabel>Move to</MenuLabel>
              <MenuRadioGroup value={t.list_id ?? ""} onValueChange={(v) => onPatch(t.id, { list_id: v || null })}>
                <MenuRadioItem value="">Inbox</MenuRadioItem>
                {lists.map((l) => (
                  <MenuRadioItem key={l.id} value={l.id}>
                    {l.name}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
              <MenuLabel>Priority</MenuLabel>
              <MenuRadioGroup value={String(t.priority)} onValueChange={(v) => onPatch(t.id, { priority: Number(v) as Task["priority"] })}>
                {PRIORITIES.map((p) => (
                  <MenuRadioItem key={p.p} value={String(p.p)}>
                    {p.label}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
              <MenuSeparator />
              <MenuItem onSelect={() => onPatch(t.id, { cancelled: !t.cancelled, ...(t.cancelled ? {} : { done: false, done_at: null }) })}>
                <span>
                  <FA icon={faXmark} /> {t.cancelled ? "Restore task" : "Cancel task"}
                </span>
              </MenuItem>
              <MenuItem onSelect={() => onPatch(t.id, { archived: !t.archived })}>
                <span>
                  <FA icon={faBoxArchive} /> {t.archived ? "Unarchive" : "Archive"}
                </span>
              </MenuItem>
              <MenuItem danger onSelect={() => onDelete(t)}>
                <span>
                  <FA icon={faTrash} /> Delete
                </span>
              </MenuItem>
            </Menu>
            <button type="button" aria-label="Close" title="Close" onClick={onClose}>
              <FA icon={faXmark} />
            </button>
          </span>
        </div>

        <div className="tp-title">
          <button
            className="ti-check"
            data-p={t.priority}
            role="checkbox"
            aria-checked={t.done}
            aria-label={`Mark “${t.title}” ${t.done ? "not done" : "done"}`}
            disabled={t.cancelled || t.archived}
            onClick={() => onToggle(t)}
          >
            {t.done && <FA icon={faCheck} />}
          </button>
          <textarea
            value={title}
            rows={1}
            maxLength={300}
            aria-label="Task name"
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLTextAreaElement).blur();
              }
            }}
          />
        </div>

        <dl className="tp-props">
          {row(
            faListUl,
            "List",
            <Menu label="Change list" align="start" trigger={<>{list?.name ?? "Inbox"}</>} className="tp-val">
              <MenuRadioGroup value={t.list_id ?? ""} onValueChange={(v) => onPatch(t.id, { list_id: v || null })}>
                <MenuRadioItem value="">Inbox</MenuRadioItem>
                {lists.map((l) => (
                  <MenuRadioItem key={l.id} value={l.id}>
                    {l.name}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </Menu>,
          )}
          {row(
            faCalendarDay,
            "Date",
            <DatePopover
              value={t.due_date}
              start={t.start_date ?? null}
              today={today}
              onChange={(d) => onPatch(t.id, { due_date: d && t.recurrence ? firstDue(d, t.recurrence, today) : d, start_date: null, ...(d ? {} : { remind_time: null }) })}
              onRange={(from, to) => onPatch(t.id, { start_date: from, due_date: to, recurrence: null, ...(from ? { remind_time: null } : {}) })}
            >
              <button type="button" className="tp-val" data-tone={!t.due_date ? "none" : late ? "late" : t.due_date === today ? "today" : "later"}>
                {t.due_date ? rangeLabel(t.start_date, t.due_date, today) : "No date"}
              </button>
            </DatePopover>,
          )}
          {row(
            faFlag,
            "Priority",
            <Menu
              label="Change priority"
              align="start"
              trigger={
                <>
                  <i className="tp-dot" data-p={t.priority} aria-hidden /> {PRIORITY_NAME[t.priority]}
                </>
              }
              className="tp-val"
            >
              <MenuRadioGroup value={String(t.priority)} onValueChange={(v) => onPatch(t.id, { priority: Number(v) as Task["priority"] })}>
                <MenuRadioItem value="5">None</MenuRadioItem>
                {PRIORITIES.filter((p) => p.p < 5).map((p) => (
                  <MenuRadioItem key={p.p} value={String(p.p)}>
                    {p.label}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </Menu>,
          )}
          {row(
            faBell,
            "Reminder",
            t.due_date && !t.start_date ? (
              <select
                className="tp-val bg-transparent outline-none"
                value={clockOf(t.remind_time) ?? ""}
                onChange={(e) => onPatch(t.id, { remind_time: e.target.value || null })}
                aria-label="Reminder time"
              >
                <option value="">No reminder</option>
                {REMINDER_TIMES.map((x) => (
                  <option key={x} value={x}>
                    {clockLabel(x)}
                  </option>
                ))}
              </select>
            ) : (
              <span className="tp-muted">Pick a single day first</span>
            ),
          )}
          {row(
            faRotate,
            "Repeat",
            <Menu
              label="Change repeat"
              align="start"
              trigger={<span className={t.recurrence ? "" : "tp-muted"}>{recurrenceLabel(t.recurrence)}</span>}
              className="tp-val"
            >
              <MenuRadioGroup
                value={t.recurrence ?? ""}
                onValueChange={(v) => onPatch(t.id, { recurrence: v || null, ...(v && !t.due_date ? { due_date: firstDue(null, v, today) } : {}) })}
              >
                {recurrenceChoices(t.due_date, t.recurrence).map(([v, l]) => (
                  <MenuRadioItem key={v} value={v}>
                    {l}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </Menu>,
          )}
          {row(
            faCircleCheck,
            "Status",
            <Menu
              label="Change status"
              align="start"
              trigger={
                <>
                  {status} <FA icon={faChevronDown} className="text-[10px]" />
                </>
              }
              className="tp-val"
            >
              <MenuRadioGroup
                value={status}
                onValueChange={(v) => {
                  if (v === "Pending") onPatch(t.id, { done: false, done_at: null, cancelled: false });
                  else if (v === "Completed") {
                    if (t.cancelled) onPatch(t.id, { cancelled: false });
                    if (!t.done) onToggle({ ...t, cancelled: false });
                  } else onPatch(t.id, { cancelled: true, done: false, done_at: null });
                }}
              >
                <MenuRadioItem value="Pending">Pending</MenuRadioItem>
                <MenuRadioItem value="Completed">Completed</MenuRadioItem>
                <MenuRadioItem value="Cancelled">Cancelled</MenuRadioItem>
              </MenuRadioGroup>
            </Menu>,
          )}
        </dl>

        <textarea
          ref={descRef}
          className="tp-desc"
          value={desc}
          rows={1}
          maxLength={5000}
          placeholder="Add a description"
          aria-label="Description"
          onChange={(e) => setDesc(e.target.value)}
          onBlur={saveDesc}
        />

        <section className="tp-subs" aria-label="Sub-tasks">
          <button type="button" className="tp-subs-h" aria-expanded={subsOpen} onClick={() => setSubsOpen(!subsOpen)}>
            <FA icon={subsOpen ? faChevronDown : faChevronRight} /> Sub-tasks
            {subtasks.length > 0 && (
              <small>
                {subtasks.filter((s) => s.done).length} of {subtasks.length}
              </small>
            )}
          </button>
          {subsOpen && (
            <>
              <ul>
                {subtasks.map((s) => (
                  <li key={s.id} data-done={s.done}>
                    <button
                      className="ti-check"
                      data-p={s.priority}
                      role="checkbox"
                      aria-checked={s.done}
                      aria-label={`Mark “${s.title}” ${s.done ? "not done" : "done"}`}
                      onClick={() => onToggle(s)}
                    >
                      {s.done && <FA icon={faCheck} />}
                    </button>
                    <span>{s.title}</span>
                    <button className="tp-subdel" aria-label={`Delete sub-task “${s.title}”`} onClick={() => onDeleteSub(s)}>
                      <FA icon={faTrash} />
                    </button>
                  </li>
                ))}
              </ul>
              {adding ? (
                <form
                  className="tp-subform"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const v = sub.trim();
                    if (!v) return;
                    setSub("");
                    await onAddSub(v.slice(0, 300));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setAdding(false);
                    }
                  }}
                >
                  <input autoFocus value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Sub-task name" maxLength={300} aria-label="Sub-task name" />
                  <span className="tp-subform-foot">
                    <small>Sub-task of {t.title}</small>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(false)}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" disabled={!sub.trim()}>
                      Add sub-task
                    </button>
                  </span>
                </form>
              ) : (
                <button type="button" className="tp-addsub" onClick={() => setAdding(true)}>
                  <FA icon={faPlus} /> Add sub-task
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </Modal>
  );
}

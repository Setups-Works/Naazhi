"use client";
import { useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faBoxArchive,
  faChevronDown,
  faChevronRight,
  faChevronUp,
  faLink,
  faCalendarDay,
  faCheck,
  faClone,
  faEllipsis,
  faInbox,
  faPen,
  faRotate,
  faTrash,
  faHashtag,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import Menu, { MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "../../ui/Menu";
import { addDays } from "../../../lib/dates";
import type { Task, TaskList } from "../../../lib/workspace";
import { dayLabel, rangeLabel } from "../../../lib/dates";
import { ctxProps } from "../../../lib/context-actions";
import { PRIORITIES, recurrenceLabel, type Draft } from "../../../lib/tasks";
import Markdown from "../Markdown";

/** The first few lines of a description for the list row, with an ellipsis when there is more. */
const shortDescription = (text: string) => {
  const lines = text.trim().split("\n");
  return lines.length > 4 ? `${lines.slice(0, 4).join("\n")}\n…` : text.trim();
};

export type RowCtx = {
  today: string;
  lists: TaskList[];
  selected: Set<string>;
  onToggle: (t: Task) => void;
  onOpen: (t: Task) => void;
  onDelete: (t: Task) => void;
  onSelect: (t: Task) => void;
  /** Sub-tasks by parent task id. */
  subs?: Record<string, Task[]>;
  /** Row menu actions (the To-do page supplies them; other screens may leave them out). */
  onPatch?: (id: string, changes: Partial<Task>) => void;
  onReschedule?: (ids: string[], date: string) => void;
  onAdd?: (d: Draft) => unknown;
  /** Opens the add-task form with these values filled in ("Add task above / below" in the row menu). */
  onNew?: (defaults: Partial<Draft>) => void;
};

export default function TaskItem({ task: t, ctx, showList = true }: { task: Task; ctx: RowCtx; showList?: boolean }) {
  const list = ctx.lists.find((l) => l.id === t.list_id);
  const late = !t.done && !!t.due_date && t.due_date < ctx.today;
  const tone = !t.due_date ? "" : late ? "late" : t.due_date === ctx.today ? "today" : "later";
  const chosen = ctx.selected.has(t.id);
  const subs = ctx.subs?.[t.id] ?? [];
  const subsDone = subs.filter((s) => s.done).length;
  const [showSubs, setShowSubs] = useState(false);

  return (
    <li
      className="ti"
      data-task-row
      data-task-id={t.id}
      {...ctxProps("task", t.id, { done: t.done })}
      data-done={t.done}
      data-cancelled={t.cancelled}
      data-selected={chosen}
      tabIndex={0}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          ctx.onSelect(t);
        } else ctx.onOpen(t);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) ctx.onOpen(t);
      }}
    >
      <button
        className="ti-check"
        data-p={t.priority}
        role="checkbox"
        aria-checked={t.done}
        aria-label={`Mark “${t.title}” ${t.done ? "not done" : "done"}`}
        onClick={(e) => {
          e.stopPropagation();
          ctx.onToggle(t);
        }}
        disabled={t.cancelled || t.archived}
      >
        {t.done && <FA icon={faCheck} />}
      </button>
      <div className="ti-main">
        <span className="ti-title">{t.title}</span>
        {t.description && (
          // Rendered as Markdown so lists (a shopping list) and links to other items, with their hover cards, work here too.
          // The hover card needs room, so the text is cut by lines instead of clipped by the box.
          <div
            className="ti-desc-md"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) e.stopPropagation(); // a link opens its target, not the task
            }}
          >
            <Markdown text={shortDescription(t.description)} />
          </div>
        )}
        {(t.due_date || t.recurrence || subs.length > 0) && (
          <span className="ti-meta">
            {t.due_date && (
              <span data-tone={tone}>
                <FA icon={faCalendarDay} /> {rangeLabel(t.start_date, t.due_date, ctx.today)}
              </span>
            )}
            {subs.length > 0 && (
              <button
                type="button"
                className="ti-subcount"
                aria-expanded={showSubs}
                aria-label={`${subsDone} of ${subs.length} sub-tasks done`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSubs(!showSubs);
                }}
              >
                ↳ {subsDone}/{subs.length} <FA icon={showSubs ? faChevronDown : faChevronRight} />
              </button>
            )}
            {t.recurrence && (
              <span title="Repeats">
                <FA icon={faRotate} /> {recurrenceLabel(t.recurrence)}
              </span>
            )}
          </span>
        )}
      </div>
      <span className="ti-acts" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn" aria-label={`Edit “${t.title}”`} title="Edit" onClick={() => ctx.onOpen(t)}>
          <FA icon={faPen} />
        </button>
        {ctx.onReschedule && (
          <Menu label={`Reschedule “${t.title}”`} trigger={<FA icon={faCalendarDay} />} compact>
            <MenuLabel>Reschedule</MenuLabel>
            {(
              [
                ["Today", ctx.today],
                ["Tomorrow", addDays(ctx.today, 1)],
                ["Next week", addDays(ctx.today, 7)],
              ] as const
            ).map(([l, d]) => (
              <MenuItem key={l} onSelect={() => ctx.onReschedule?.([t.id], d)}>
                {l}
              </MenuItem>
            ))}
          </Menu>
        )}
        <Menu label={`More options for “${t.title}”`} trigger={<FA icon={faEllipsis} />} compact>
          {ctx.onNew && (
            <>
              <MenuItem onSelect={() => ctx.onNew?.({ due_date: t.due_date, list_id: t.list_id, priority: t.priority })}>
                <span>
                  <FA icon={faChevronUp} /> Add task above
                </span>
              </MenuItem>
              <MenuItem onSelect={() => ctx.onNew?.({ due_date: t.due_date, list_id: t.list_id, priority: t.priority })}>
                <span>
                  <FA icon={faChevronDown} /> Add task below
                </span>
              </MenuItem>
              <MenuSeparator />
            </>
          )}
          <MenuItem onSelect={() => ctx.onOpen(t)}>
            <span>
              <FA icon={faPen} /> Edit
            </span>
            <kbd>E</kbd>
          </MenuItem>
          {ctx.onAdd && (
            <MenuItem
              onSelect={() =>
                ctx.onAdd?.({ title: t.title, description: t.description, due_date: t.due_date, priority: t.priority, list_id: t.list_id, recurrence: t.recurrence })
              }
            >
              <span>
                <FA icon={faClone} /> Duplicate
              </span>
            </MenuItem>
          )}
          <MenuItem onSelect={() => void navigator.clipboard.writeText(`${window.location.origin}/dashboard/todo?task=${t.id}`).catch(() => undefined)}>
            <span>
              <FA icon={faLink} /> Copy link
            </span>
          </MenuItem>
          {ctx.onPatch && (
            <>
              <MenuSeparator />
              <MenuLabel>Move to</MenuLabel>
              <MenuRadioGroup value={t.list_id ?? ""} onValueChange={(v) => ctx.onPatch?.(t.id, { list_id: v || null })}>
                <MenuRadioItem value="">Inbox</MenuRadioItem>
                {ctx.lists.map((l) => (
                  <MenuRadioItem key={l.id} value={l.id}>
                    {l.name}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
              <MenuSeparator />
              <MenuLabel>Priority</MenuLabel>
              <MenuRadioGroup value={String(t.priority)} onValueChange={(v) => ctx.onPatch?.(t.id, { priority: Number(v) as Task["priority"] })}>
                {PRIORITIES.map((p) => (
                  <MenuRadioItem key={p.p} value={String(p.p)}>
                    {p.label}
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
              <MenuSeparator />
              <MenuItem onSelect={() => ctx.onPatch?.(t.id, { cancelled: !t.cancelled, ...(t.cancelled ? {} : { done: false, done_at: null }) })}>
                <span>
                  <FA icon={faXmark} /> {t.cancelled ? "Restore task" : "Cancel task"}
                </span>
              </MenuItem>
              <MenuItem onSelect={() => ctx.onPatch?.(t.id, { archived: !t.archived })}>
                <span>
                  <FA icon={faBoxArchive} /> {t.archived ? "Unarchive" : "Archive"}
                </span>
              </MenuItem>
            </>
          )}
          <MenuItem danger onSelect={() => ctx.onDelete(t)}>
            <span>
              <FA icon={faTrash} /> Delete
            </span>
          </MenuItem>
        </Menu>
      </span>
      {showList && (
        <span className="ti-list" data-tone={list?.color}>
          {list ? (
            <>
              <FA icon={faHashtag} /> {list.name}
            </>
          ) : (
            <>
              <FA icon={faInbox} /> Inbox
            </>
          )}
        </span>
      )}
    </li>
  );
}

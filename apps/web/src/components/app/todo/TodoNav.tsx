"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faCalendarDay,
  faCalendarDays,
  faChevronDown,
  faChevronRight,
  faCircleCheck,
  faCirclePlus,
  faHashtag,
  faInbox,
  faMagnifyingGlass,
  faPlus,
  faTableCells,
} from "@fortawesome/free-solid-svg-icons";
import { LIST_TONES, isView, isOpen, type ViewKey } from "../../../lib/tasks";
import { isoDate } from "../../../lib/dates";
import { readPrefs } from "../../../lib/prefs";
import { publicPath } from "../../../lib/hosts";
import { useTaskActions, useTaskLists, useTasks } from "../../../features/tasks/queries";
import { openSearch } from "../UniversalSearch";

const todoHref = (v: ViewKey, extra = "") => publicPath(`/dashboard/todo?v=${encodeURIComponent(v)}${extra}`);

/**
 * The to-do views (Inbox, Today, Upcoming…) and "My Lists", shown inside the app sidebar while you are on the To-do page. It reads the
 * current view from the address and navigates by changing it, so the page itself carries no side panel of its own.
 */
export default function TodoNav({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("v");
  const view: ViewKey = isView(raw) ? raw : readPrefs().todoView;
  const today = isoDate();
  const { tasks } = useTasks();
  const { lists } = useTaskLists();
  const actions = useTaskActions(() => undefined, today);

  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(LIST_TONES[0]);

  // Sub-tasks are counted under their parent, not on their own.
  const live = tasks.filter((t) => isOpen(t) && !t.parent_id);
  const count = (v: string) =>
    v === "inbox"
      ? live.filter((t) => !t.list_id).length
      : v === "today"
        ? live.filter((t) => t.due_date && t.due_date <= today).length
        : live.filter((t) => t.list_id === v.slice(5)).length;

  const go = (v: ViewKey, extra = "") => {
    onNavigate?.();
    router.push(todoHref(v, extra), { scroll: false });
  };

  const item = (v: ViewKey, label: string, icon: typeof faInbox, n?: number) => (
    <button
      key={v}
      type="button"
      className="sbt-item"
      data-on={view === v || (v === "filters" && ["cancelled", "overdue", "recurring", "archived"].includes(view))}
      aria-current={view === v ? "page" : undefined}
      onClick={() => go(v)}
    >
      <FA icon={icon} /> <span>{label}</span>
      {!!n && <em>{n}</em>}
    </button>
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const row = await actions.addList(n, color);
    setName("");
    setAdding(false);
    setColor(LIST_TONES[(lists.length + 1) % LIST_TONES.length]);
    if (row) go(`list:${row.id}`);
  }

  return (
    <div className="sbt" aria-label="To-do views" role="group">
      <button type="button" className="sbt-item sbt-add" onClick={() => go(view, "&add=1")}>
        <FA icon={faPlus} /> <span>Add task</span>
        <kbd className="ml-auto font-sans text-[12px] font-normal text-ink-4">Q</kbd>
      </button>
      <button
        type="button"
        className="sbt-item"
        onClick={() => {
          onNavigate?.();
          openSearch();
        }}
      >
        <FA icon={faMagnifyingGlass} /> <span>Search to-dos</span>
        <kbd className="ml-auto font-sans text-[12px] font-normal text-ink-4">/</kbd>
      </button>
      <div className="sbt-views">
        {item("inbox", "Inbox", faInbox, count("inbox"))}
        {item("today", "Today", faCalendarDay, count("today"))}
        {item("upcoming", "Upcoming", faCalendarDays)}
        {item("filters", "Filters", faTableCells)}
        {item("completed", "Completed", faCircleCheck)}
      </div>

      <button type="button" className="sbt-sec" aria-expanded={open} onClick={() => setOpen(!open)}>
        <FA icon={open ? faChevronDown : faChevronRight} /> My lists
      </button>
      {open && (
        <>
          {lists.map((l) => (
            <button
              key={l.id}
              type="button"
              className="sbt-item"
              data-on={view === `list:${l.id}`}
              data-tone={l.color}
              aria-current={view === `list:${l.id}` ? "page" : undefined}
              onClick={() => go(`list:${l.id}`)}
            >
              <FA icon={faHashtag} className="sbt-dot" /> <span>{l.name}</span>
              {count(`list:${l.id}`) > 0 && <em>{count(`list:${l.id}`)}</em>}
            </button>
          ))}
          {adding ? (
            <form
              className="sbt-new"
              onSubmit={submit}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAdding(false);
              }}
            >
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="List name" aria-label="List name" />
              <div className="sbt-colors" role="group" aria-label="List colour">
                {LIST_TONES.map((t) => (
                  <button type="button" key={t} className={`at-${t}`} data-on={color === t} aria-label={t} aria-pressed={color === t} onClick={() => setColor(t)} />
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAdding(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary btn-sm" disabled={!name.trim()}>
                  Add
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="sbt-item" onClick={() => setAdding(true)}>
              <FA icon={faPlus} /> <span>{lists.length === 0 ? "Add your first list" : "Add list"}</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

"use client";
import { useMemo, useState, type ReactNode } from "react";
import { ctxProps } from "../../../lib/context-actions";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faBan,
  faBoxArchive,
  faCalendarDays,
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faClockRotateLeft,
  faPlus,
  faRotate,
} from "@fortawesome/free-solid-svg-icons";
import type { Task, TaskList } from "../../../lib/workspace";
import {
  applyOpts,
  emptyDraft,
  groupTasks,
  isOpen,
  isOverdue,
  upcomingDates,
  type Draft,
  type Group,
  type ViewKey,
  type ViewOpts,
} from "../../../lib/tasks";
import { addDays, isoDate } from "../../../lib/dates";
import { readPrefs, weekdayIndex, weekdayLabels } from "../../../lib/prefs";
import { Tabs, TabsList, TabsTrigger } from "../../ui/Tabs";
import JournalCalendar from "../JournalCalendar";
import TaskForm from "./TaskForm";
import TaskItem, { type RowCtx } from "./TaskItem";

export type VCtx = RowCtx & {
  /** The overdue tasks, for the Overdue header's "Select". */
  overdue?: Task[];
  onAdd: (d: Draft) => Promise<unknown>;
  onReschedule: (ids: string[], date: string) => void;
  onGo: (v: ViewKey) => void;
};

const TONES = ["violet", "blue", "green", "amber", "clay", "mint", "gold"];

/** "Oct 7 · Today · Wednesday" */
export function dayHead(iso: string, today: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const rel = iso === today ? "Today" : iso === addDays(today, 1) ? "Tomorrow" : "";
  return [dt.toLocaleDateString(undefined, { month: "short", day: "numeric" }), rel, dt.toLocaleDateString(undefined, { weekday: "long" })]
    .filter(Boolean)
    .join(" · ");
}

/** Upcoming day heading in the reference's style: "Tomorrow · Thu Nov 12" for today and tomorrow, "Fri Nov 13" after that. */
export function upcomingHead(iso: string, today: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const short = `${dt.toLocaleDateString(undefined, { weekday: "short" })} ${dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  const rel = iso === today ? "Today" : iso === addDays(today, 1) ? "Tomorrow" : "";
  return rel ? `${rel} · ${short}` : short;
}

export function Empty({ title, text }: { icon?: typeof faCircleCheck; title: string; text: string }) {
  return (
    <div className="tv-empty">
      {/* A sun over the horizon with a tick, as a thin ink line drawing (the reference's empty-state style). */}
      <svg viewBox="0 0 170 80" width="170" height="80" aria-hidden fill="none" stroke="var(--ink)" strokeWidth="1.3" strokeLinecap="round">
        <path d="M4 76h162" />
        <path d="M45 76a40 40 0 0 1 80 0" />
        <path d="M85 20V8M55 32l-8-8M115 32l8-8M37 56H25M133 56h12" />
        <path d="M72 58l9 9 18-20" />
      </svg>
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}

function InlineAdd({ ctx, defaults, label = "Add task" }: { ctx: VCtx; defaults: Partial<Draft>; label?: string }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button className="tv-add" onClick={() => setOpen(true)}>
        <FA icon={faPlus} /> {label}
      </button>
    );
  return (
    <div className="tv-addform">
      <TaskForm
        initial={emptyDraft(defaults)}
        draftKey="todo:inline-task"
        lists={ctx.lists}
        submitLabel="Add task"
        onCancel={() => setOpen(false)}
        onSubmit={async (d) => {
          await ctx.onAdd(d);
        }}
      />
    </div>
  );
}

function Section({
  title,
  count,
  tone,
  tasks,
  ctx,
  defaults,
  action,
  showList = true,
  collapsible = true,
  empty,
}: {
  title: ReactNode;
  count?: number;
  tone: string;
  tasks: Task[];
  ctx: VCtx;
  defaults?: Partial<Draft>;
  action?: ReactNode;
  showList?: boolean;
  collapsible?: boolean;
  empty?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`ap-card at-${tone} tv-sec`}>
      {(title || action) && (
        <header className="tv-sec-h">
          {collapsible && title ? (
            <button aria-expanded={open} aria-label={open ? "Collapse section" : "Expand section"} onClick={() => setOpen(!open)}>
              <FA icon={open ? faChevronDown : faChevronRight} />
            </button>
          ) : null}
          <h3>{title}</h3>
          {count !== undefined && <small>{count}</small>}
          <span className="tv-sec-a">{action}</span>
        </header>
      )}
      {open && (
        <>
          {tasks.length > 0 && (
            <ul>
              {tasks.map((t) => (
                <TaskItem key={t.id} task={t} ctx={ctx} showList={showList} />
              ))}
            </ul>
          )}
          {tasks.length === 0 && empty && <p className="ap-none">{empty}</p>}
          {defaults && <InlineAdd ctx={ctx} defaults={defaults} />}
        </>
      )}
    </section>
  );
}

/** The Overdue header's actions: move every overdue task to today, or select them all for the bulk bar. */
function Reschedule({ ids, ctx, today }: { ids: string[]; ctx: VCtx; today: string }) {
  return (
    <>
      <button type="button" className="tv-resched" onClick={() => ctx.onReschedule(ids, today)}>
        Reschedule to today
      </button>
      <button
        type="button"
        className="tv-resched"
        onClick={() => {
          for (const t of ctx.overdue ?? []) if (!ctx.selected.has(t.id)) ctx.onSelect(t);
        }}
      >
        Select
      </button>
    </>
  );
}

function groupDefaults(g: Group): Partial<Draft> {
  if (g.date) return { due_date: g.date };
  if (/^p[1-5]$/.test(g.key)) return { priority: Number(g.key[1]) as Draft["priority"] };
  if (/^[0-9a-f-]{36}$/i.test(g.key)) return { list_id: g.key };
  return {};
}

/* ---------- list layout ---------- */
export function ListLayout({
  view,
  tasks,
  opts,
  lists,
  ctx,
  today,
  defaults,
  tone,
}: {
  view: ViewKey;
  tasks: Task[];
  opts: ViewOpts;
  lists: TaskList[];
  ctx: VCtx;
  today: string;
  defaults: Partial<Draft>;
  tone: string;
}) {
  const sorted = useMemo(() => applyOpts(tasks, opts), [tasks, opts]);
  if (opts.groupBy !== "none") {
    const groups = groupTasks(sorted, opts.groupBy, lists, today);
    return (
      <>
        {groups.map((g) => (
          <Section
            key={g.key}
            title={g.title}
            count={g.tasks.length}
            tone={g.tone ?? tone}
            tasks={g.tasks}
            ctx={ctx}
            defaults={groupDefaults(g)}
            showList={opts.groupBy !== "list"}
          />
        ))}
        {groups.length === 0 && <InlineAdd ctx={ctx} defaults={defaults} />}
      </>
    );
  }
  if (view === "today") {
    const late = sorted.filter((t) => isOverdue(t, today));
    const now = sorted.filter((t) => t.due_date === today);
    return (
      <>
        {late.length > 0 && (
          <Section
            title="Overdue"
            count={late.length}
            tone="clay"
            tasks={late}
            ctx={ctx}
            action={<Reschedule ids={late.map((t) => t.id)} ctx={{ ...ctx, overdue: late }} today={today} />}
          />
        )}
        <Section title="Today" count={now.length} tone="amber" tasks={now} ctx={ctx} defaults={defaults} collapsible={false} />
      </>
    );
  }
  const canAdd = view === "inbox" || view.startsWith("list:");
  return (
    <Section
      title=""
      tone={tone}
      tasks={sorted}
      ctx={ctx}
      defaults={canAdd ? defaults : undefined}
      empty={
        canAdd
          ? undefined
          : view === "overdue"
            ? "Nothing overdue. Nice."
            : view === "recurring"
              ? "No recurring tasks. Set “Repeat” on a task to add one."
              : view === "cancelled"
                ? "No cancelled tasks."
                : view === "archived"
                  ? "Nothing archived."
                  : "No tasks."
      }
    />
  );
}

/* ---------- board layout ---------- */
export function BoardLayout({
  tasks,
  opts,
  lists,
  ctx,
  today,
  defaults,
}: {
  tasks: Task[];
  opts: ViewOpts;
  lists: TaskList[];
  ctx: VCtx;
  today: string;
  defaults: Partial<Draft>;
}) {
  const sorted = useMemo(() => applyOpts(tasks, opts), [tasks, opts]);
  const cols: Group[] = useMemo(() => {
    if (opts.groupBy !== "none") return groupTasks(sorted, opts.groupBy, lists, today);
    const open = (t: Task) => isOpen(t);
    return [
      { key: "late", title: "Overdue", tone: "clay", tasks: sorted.filter((t) => open(t) && t.due_date && t.due_date < today) },
      { key: "today", title: "Today", tone: "amber", tasks: sorted.filter((t) => open(t) && t.due_date === today), date: today },
      {
        key: "later",
        title: "Upcoming",
        tone: "mint",
        tasks: sorted.filter((t) => open(t) && t.due_date && t.due_date > today),
        date: addDays(today, 1),
      },
      { key: "none", title: "No date", tone: "sand", tasks: sorted.filter((t) => open(t) && !t.due_date) },
      ...(opts.showCompleted ? [{ key: "done", title: "Completed", tone: "green", tasks: sorted.filter((t) => t.done) }] : []),
    ];
  }, [sorted, opts.groupBy, opts.showCompleted, lists, today]);
  return (
    <div className="tv-board">
      {cols.map((c) => (
        <section key={c.key} className={`ap-card at-${c.tone ?? "sand"} tv-col`}>
          <header className="tv-sec-h">
            <h3>{c.title}</h3>
            <small>{c.tasks.length}</small>
          </header>
          {c.tasks.length > 0 && (
            <ul>
              {c.tasks.map((t) => (
                <TaskItem key={t.id} task={t} ctx={ctx} showList={opts.groupBy !== "list"} />
              ))}
            </ul>
          )}
          {c.key !== "done" && <InlineAdd ctx={ctx} defaults={{ ...defaults, ...groupDefaults(c) }} />}
        </section>
      ))}
    </div>
  );
}

/* ---------- calendar layout ---------- */
export function CalendarLayout({
  tasks,
  opts,
  ctx,
  today,
  onAddOn,
}: {
  tasks: Task[];
  opts: ViewOpts;
  ctx: VCtx;
  today: string;
  onAddOn: (date: string) => void;
}) {
  const [view, setView] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  // Month (a grid of weeks) or Week (seven day columns with an All day row and the hours), as in the reference.
  const [mode, setMode] = useState<"month" | "week">("month");
  const thisWeek = () => addDays(today, -weekdayIndex(new Date(`${today}T12:00:00`)));
  const [ws, setWs] = useState(thisWeek);
  const sorted = useMemo(() => applyOpts(tasks, opts), [tasks, opts]);
  const first = new Date(view.y, view.m, 1);
  const offset = weekdayIndex(first);
  const cells = Array.from({ length: 42 }, (_, i) => new Date(view.y, view.m, 1 - offset + i));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const lastDay = mode === "week" ? weekDays[6] : isoDate(cells[cells.length - 1]);
  // Open repeating tasks also appear on every later day they come back on (shown softer, and they open the real task).
  const { by, original } = useMemo(() => {
    const m = new Map<string, Task[]>();
    const original = new Map<Task, Task>();
    const add = (iso: string, t: Task) => m.set(iso, [...(m.get(iso) ?? []), t]);
    sorted.forEach((t) => {
      if (!t.due_date) return;
      add(t.due_date, t);
      // A task that spans days also shows on each earlier day of its span (as a copy that opens the real task).
      if (t.start_date && t.start_date < t.due_date) {
        for (let iso = t.start_date; iso < t.due_date; iso = addDays(iso, 1)) {
          const copy = { ...t };
          original.set(copy, t);
          add(iso, copy);
        }
      }
      if (t.recurrence && !t.done && !t.cancelled && !t.archived) {
        for (const iso of upcomingDates(t.due_date, t.recurrence, lastDay)) {
          const copy = { ...t, due_date: iso };
          original.set(copy, t);
          add(iso, copy);
        }
      }
    });
    return { by: m, original };
  }, [sorted, lastDay]);
  const shift = (n: number) =>
    mode === "week"
      ? setWs((w) => addDays(w, n * 7))
      : setView(({ y, m }) => {
          const d = new Date(y, m + n, 1);
          return { y: d.getFullYear(), m: d.getMonth() };
        });
  const goToday = () => {
    const d = new Date();
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setWs(thisWeek());
  };
  const chip = (t: Task) => {
    const real = original.get(t); // set when this chip is a repeat of a task whose own date is earlier
    return (
      <button
        key={t.id}
        className="tv-cal-chip"
        {...(real ? {} : ctxProps("task", t.id, { done: t.done }))}
        data-p={t.priority}
        data-done={t.done}
        data-repeat={!!real}
        onClick={() => ctx.onOpen(real ?? t)}
        title={real ? `${t.title} (repeats)` : t.title}
      >
        {t.title}
      </button>
    );
  };
  const wsDate = new Date(`${ws}T12:00:00`);
  const title = (mode === "week" ? wsDate : first).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const now = new Date();
  const nowPct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
  return (
    <section className="ap-card at-violet tv-cal">
      <header className="tv-sec-h">
        <button className="btn btn-secondary btn-sm" onClick={goToday}>
          Today
        </button>
        <button className="ne-btn" aria-label={mode === "week" ? "Previous week" : "Previous month"} onClick={() => shift(-1)}>
          <FA icon={faChevronLeft} />
        </button>
        <button className="ne-btn" aria-label={mode === "week" ? "Next week" : "Next month"} onClick={() => shift(1)}>
          <FA icon={faChevronRight} />
        </button>
        <h3>{title}</h3>
        <span className="tv-sec-a">
          <span className="tv-seg" role="group" aria-label="Calendar range">
            {(["week", "month"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}>
                {k === "week" ? "Week" : "Month"}
              </button>
            ))}
          </span>
        </span>
      </header>
      {mode === "month" ? (
        <div className="tv-cal-grid">
          {weekdayLabels("short").map((d) => (
            <span key={d} className="tv-cal-dow">
              {d}
            </span>
          ))}
          {cells.map((d) => {
            const iso = isoDate(d);
            const list = by.get(iso) ?? [];
            return (
              <div key={iso} className="tv-cal-day" data-out={d.getMonth() !== view.m} data-today={iso === today}>
                <button className="tv-cal-num" aria-label={`Add task on ${iso}`} onClick={() => onAddOn(iso)}>
                  {d.getDate()}
                </button>
                {list.slice(0, 3).map(chip)}
                {list.length > 3 && <small>+{list.length - 3} more</small>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tv-wk" role="grid" aria-label="Week">
          <div className="tv-wk-row tv-wk-head" role="row">
            <span />
            {weekDays.map((iso) => {
              const d = new Date(`${iso}T12:00:00`);
              return (
                <span key={iso} role="columnheader" data-today={iso === today}>
                  <small>{d.toLocaleDateString(undefined, { weekday: "short" })}</small>
                  <b>{d.getDate()}</b>
                </span>
              );
            })}
          </div>
          <div className="tv-wk-row tv-wk-allday" role="row">
            <span>All day</span>
            {weekDays.map((iso) => (
              <div key={iso} role="gridcell">
                {(by.get(iso) ?? []).map(chip)}
                <button type="button" className="tv-wk-add" aria-label={`Add task on ${iso}`} onClick={() => onAddOn(iso)}>
                  +
                </button>
              </div>
            ))}
          </div>
          <div className="tv-wk-row tv-wk-hours">
            <div className="tv-wk-gutter" aria-hidden>
              {Array.from({ length: 24 }, (_, h) => (
                <span key={h}>{h === 0 ? "" : new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: "numeric" })}</span>
              ))}
            </div>
            {weekDays.map((iso) => (
              <div key={iso} className="tv-wk-col" data-today={iso === today} aria-hidden>
                {iso === today && <i className="tv-wk-now" style={{ top: `${nowPct}%` }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- upcoming ---------- */
export function UpcomingView({ tasks, ctx, today }: { tasks: Task[]; ctx: VCtx; today: string }) {
  const [sel, setSel] = useState(today);
  const [days, setDays] = useState(14);
  const open = tasks.filter(isOpen);
  const overdue = open.filter((t) => isOverdue(t, today));

  const [y, m, d] = sel.split("-").map(Number);
  const weekStart = addDays(sel, -weekdayIndex(new Date(y, m - 1, d)));
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const label = new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const list = Array.from({ length: days }, (_, i) => addDays(sel, i));
  const lastShown = addDays(sel, Math.max(days, 7) + 7);

  // Repeating to-dos also show on each later day they come back on. Those rows are copies that act on the real task.
  const { byDay, realOf } = useMemo(() => {
    const byDay = new Map<string, Task[]>();
    const realOf = new Map<Task, Task>();
    const add = (iso: string, t: Task) => byDay.set(iso, [...(byDay.get(iso) ?? []), t]);
    open.forEach((t) => {
      if (!t.due_date) return;
      add(t.due_date, t);
      if (!t.recurrence) return;
      const every = readPrefs().showEveryRepeat;
      for (const iso of upcomingDates(t.due_date, t.recurrence, lastShown).slice(0, every ? undefined : 1)) {
        const copy = { ...t, due_date: iso };
        realOf.set(copy, t);
        add(iso, copy);
      }
    });
    return { byDay, realOf };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `open` is derived from `tasks`
  }, [tasks, lastShown]);
  const counts = useMemo(() => Object.fromEntries([...byDay].map(([iso, list]) => [iso, list.length])), [byDay]);
  // Most urgent priority scheduled on each day (1 urgent … 4 low), drawn as a small coloured bar under the date.
  const topPriority = useMemo(
    () =>
      Object.fromEntries(
        [...byDay].map(([iso, list]) => {
          const ps = list.map((t) => t.priority).filter((p) => p > 0);
          return [iso, ps.length ? Math.min(...ps) : 0];
        }),
      ),
    [byDay],
  );
  const real = (t: Task) => realOf.get(t) ?? t;
  const rowCtx: VCtx = {
    ...ctx,
    onOpen: (t) => ctx.onOpen(real(t)),
    onToggle: (t) => ctx.onToggle(real(t)),
    onDelete: (t) => ctx.onDelete(real(t)),
    onSelect: (t) => ctx.onSelect(real(t)),
  };

  return (
    <>
      <div className="tv-up-head">
        <JournalCalendar value={sel} today={today} counts={counts} onPick={setSel} label={label} allowFuture />
        <span className="tv-up-nav">
          <button className="ne-btn" aria-label="Previous week" onClick={() => setSel(addDays(sel, -7))}>
            <FA icon={faChevronLeft} />
          </button>
          <button className="ne-btn" aria-label="Next week" onClick={() => setSel(addDays(sel, 7))}>
            <FA icon={faChevronRight} />
          </button>
          <button className="tv-today" onClick={() => setSel(today)}>
            Today
          </button>
        </span>
      </div>
      <Tabs value={sel} onValueChange={setSel}>
        <TabsList className="tv-week" aria-label="Week">
          {week.map((iso) => {
            const dt = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8)));
            return (
              <TabsTrigger key={iso} value={iso} data-today={iso === today}>
                <small>{dt.toLocaleDateString(undefined, { weekday: "short" })}</small>
                <b>{dt.getDate()}</b>
                {counts[iso] > 0 && <i aria-hidden data-p={topPriority[iso]} />}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      {overdue.length > 0 && (
        <Section
          title="Overdue"
          count={overdue.length}
          tone="clay"
          tasks={overdue}
          ctx={ctx}
          action={<Reschedule ids={overdue.map((t) => t.id)} ctx={ctx} today={today} />}
        />
      )}
      {list.map((iso, i) => (
        <Section
          key={iso}
          title={upcomingHead(iso, today)}
          count={(byDay.get(iso) ?? []).length}
          tone={TONES[(i + 3) % TONES.length]}
          tasks={byDay.get(iso) ?? []}
          ctx={rowCtx}
          defaults={{ due_date: iso }}
          collapsible={false}
        />
      ))}
      <button className="btn btn-secondary btn-sm tv-more" onClick={() => setDays(days + 14)}>
        Show 2 more weeks
      </button>
    </>
  );
}

/* ---------- filters index ---------- */
export function FiltersIndex({ tasks, today, onGo }: { tasks: Task[]; today: string; onGo: (v: ViewKey) => void }) {
  const rows: [ViewKey, string, typeof faCircleCheck, string, number][] = [
    ["upcoming", "Upcoming", faCalendarDays, "blue", tasks.filter((t) => isOpen(t) && !!t.due_date).length],
    ["completed", "Completed", faCircleCheck, "green", tasks.filter((t) => t.done && !t.archived).length],
    ["cancelled", "Cancelled", faBan, "sand", tasks.filter((t) => t.cancelled && !t.archived).length],
    ["overdue", "Overdue", faClockRotateLeft, "clay", tasks.filter((t) => isOverdue(t, today)).length],
    ["recurring", "Recurring", faRotate, "violet", tasks.filter((t) => !!t.recurrence && !t.done && !t.archived && !t.cancelled).length],
    ["archived", "Archived", faBoxArchive, "gold", tasks.filter((t) => t.archived).length],
  ];
  return (
    <ul className="tv-filters">
      {rows.map(([v, label, icon, tone, n]) => (
        <li key={v}>
          <button className={`at-${tone}`} onClick={() => onGo(v)}>
            <span>
              <FA icon={icon} />
            </span>
            <b>{label}</b>
            {n > 0 && <em>{n}</em>}
            <FA icon={faChevronRight} className="tv-go" />
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ---------- completed ---------- */
export function CompletedView({ tasks, lists, ctx, today }: { tasks: Task[]; lists: TaskList[]; ctx: VCtx; today: string }) {
  const [listId, setListId] = useState("all");
  const done = useMemo(
    () =>
      tasks
        .filter((t) => t.done && !t.archived && (listId === "all" || (listId === "inbox" ? !t.list_id : t.list_id === listId)))
        .sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? "")),
    [tasks, listId],
  );
  const groups = useMemo(() => {
    const m = new Map<string, Task[]>();
    done.forEach((t) => {
      const k = t.done_at ? isoDate(new Date(t.done_at)) : "none";
      m.set(k, [...(m.get(k) ?? []), t]);
    });
    return [...m.entries()];
  }, [done]);
  return (
    <>
      <label className="tv-select">
        <select value={listId} onChange={(e) => setListId(e.target.value)} aria-label="Filter by list">
          <option value="all">All lists</option>
          <option value="inbox">Inbox</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
      {groups.length === 0 && (
        <Empty icon={faCircleCheck} title="Nothing completed yet" text="Completed tasks will collect here as you check them off." />
      )}
      {groups.map(([k, list], i) => (
        <Section
          key={k}
          title={k === "none" ? "Earlier" : dayHead(k, today)}
          count={list.length}
          tone={TONES[(i + 2) % TONES.length]}
          tasks={list}
          ctx={ctx}
        />
      ))}
    </>
  );
}

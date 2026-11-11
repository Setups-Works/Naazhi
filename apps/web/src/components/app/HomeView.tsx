"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBookOpen,
  faEnvelope,
  faCalendarDays,
  faChartColumn,
  faPaperPlane,
  faComment,
  faMicrophone,
  faArrowUpRightFromSquare,
  faCalendarDay,
  faComments,
  faHeartPulse,
  faListCheck,
  faNewspaper,
  faPenToSquare,
  faPlus,
  faUserGroup,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { fmtDuration } from "@untitled/logic/health";
import { api } from "../../lib/api/client";
import { qk } from "../../lib/query/keys";
import { useRealtimeInvalidate } from "../../hooks/useRealtimeInvalidate";
import { useDraftText } from "../../hooks/useDraft";
import { useTaskActions } from "../../features/tasks/queries";
import { useCalendarEvents } from "../../features/calendar/queries";
import { groupEventsByDay } from "../../features/calendar/utils";
import { useArticles, useFeeds } from "../../features/rss/queries";
import { useHealthDays } from "../../features/health/queries";
import { useMyInvites } from "../../features/collaboration";
import { addDays, ago, greeting, isoDate } from "../../lib/dates";
import type { Chat, Note, Task } from "../../lib/workspace";
import { useBilling } from "../../features/billing/queries";
import { fmtTime } from "../../lib/prefs";
import { useHomeLayout, type HomeColumn } from "../../features/home/useHomeLayout";
import DragHandle from "../../features/home/DragHandle";
import TaskRow from "./TaskRow";
import InsightsCard from "./InsightsCard";
import HomeTip from "./HomeTip";

// Stable empty values so a still-loading query doesn't create a new array on every render.
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const EMPTY_TASKS: Task[] = [];
const EMPTY_CHATS: Chat[] = [];
const EMPTY_NOTES: Pick<Note, "id" | "title" | "updated_at">[] = [];
const EMPTY_ENTRIES: { id: string; body: string; created_at: string }[] = [];

const ask = (q: string) => `/dashboard/chat?ask=${encodeURIComponent(q)}`;
const QUICK = [
  { href: ask("Check my email and tell me what needs a reply."), t: "Check my email", icon: faEnvelope },
  { href: ask("What is on my calendar today?"), t: "Today’s calendar", icon: faCalendarDays },
  { href: ask("Plan my day from my tasks and calendar."), t: "Plan my day", icon: faListCheck },
  { href: ask("Summarize my week: tasks done, notes and journal entries."), t: "Summarize my week", icon: faChartColumn },
  { href: ask("Draft an email for me."), t: "Draft an email", icon: faPaperPlane },
];

/** A quiet glass panel: small tinted icon, a label, an optional link to the full screen. */
function Panel({
  icon,
  title,
  href,
  hint,
  meta,
  className = "",
  drag,
  children,
}: {
  icon?: IconDefinition;
  /** Muted text at the right of the header ("Next 7 days"). */
  meta?: string;
  title: string;
  href?: string;
  hint?: string;
  className?: string;
  drag?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center gap-2">
        {icon && <FA icon={icon} className="w-3.5 text-[13px] text-fg-subtle" />}
        <CardTitle className="text-[15.5px] leading-none tracking-[-0.01em]">{title}</CardTitle>
        {hint && <small className="text-[13px] text-fg-subtle">{hint}</small>}
        {meta && <small className="ml-auto text-[13px] text-fg-subtle">{meta}</small>}
        {href && (
          <Button asChild variant="ghost" size="sm" className="ml-auto text-fg-subtle">
            <Link href={href}>Open</Link>
          </Button>
        )}
        <span className={href || meta ? "" : "ml-auto"}>{drag}</span>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const Empty = ({ children }: { children: ReactNode }) => <p className="m-0 py-1 text-[13.5px] text-fg-subtle">{children}</p>;

export default function HomeView({ name }: { name: string }) {
  const sb = useMemo(api, []);
  const qc = useQueryClient();
  const today = useMemo(() => isoDate(), []);
  const [err, setErr] = useState("");
  // Unsent text survives a refresh. The journal box shares its draft with today's page on the Journal screen.
  const [journal, setJournal] = useDraftText(`journal:${today}`);
  const [title, setTitle] = useDraftText("home:task");

  // Each card is its own query: cached, refreshed on focus, and kept in sync with the To-do page
  // (tasks share the ["tasks"] key prefix, so a mutation anywhere updates every screen).
  const tasksQ = useQuery({
    queryKey: qk.tasks.home(today),
    queryFn: async () => {
      const { data, error } = await sb
        .from("tasks")
        .select("id,title,description,priority,list_id,due_date,done,done_at,cancelled,archived,recurrence,created_at")
        .or(`done.eq.false,due_date.eq.${today}`)
        .eq("cancelled", false)
        .eq("archived", false)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return data as Task[];
    },
  });
  const entriesQ = useQuery({
    queryKey: qk.journal.home(today),
    queryFn: async () => {
      const { data, error } = await sb
        .from("journal_entries")
        .select("id,body,created_at")
        .eq("entry_date", today)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as { id: string; body: string; created_at: string }[];
    },
  });
  const chatsQ = useQuery({
    queryKey: qk.chats.recent,
    queryFn: async () => {
      const { data, error } = await sb.from("chats").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data as Chat[];
    },
  });
  const notesQ = useQuery({
    queryKey: qk.notes.home,
    queryFn: async () => {
      const { data, error } = await sb.from("notes").select("id,title,updated_at").is("deleted_at", null).order("updated_at", { ascending: false }).limit(4);
      if (error) throw error;
      return data as Pick<Note, "id" | "title" | "updated_at">[];
    },
  });
  // The badge shows the plan from Plan and billing (not the old `profiles.plan` column, which stays "free" for everyone).
  const billingQ = useBilling();
  const calendarQ = useCalendarEvents();
  const feedsQ = useFeeds();
  const articlesQ = useArticles({ filter: "all", q: "" });
  const healthQ = useHealthDays(1);
  const invitesQ = useMyInvites();

  const tasks = tasksQ.data ?? EMPTY_TASKS;
  const entries = entriesQ.data ?? EMPTY_ENTRIES;
  const chats = chatsQ.data ?? EMPTY_CHATS;
  const notes = notesQ.data ?? EMPTY_NOTES;
  const billing = billingQ.data;
  const planLabel = billing ? (billing.plan && billing.status !== "none" ? billing.plan.name : "Free") : null;
  const ready = !tasksQ.isPending && !entriesQ.isPending && !chatsQ.isPending;
  const loadFailed = tasksQ.isError || entriesQ.isError || chatsQ.isError;

  useRealtimeInvalidate("tasks", [qk.tasks.all]);
  useRealtimeInvalidate("chats", [qk.chats.all]);
  useRealtimeInvalidate("journal_entries", [qk.journal.all]);
  useRealtimeInvalidate("notes", [qk.notes.all]);

  const taskActions = useTaskActions(setErr, today);

  const addEntryMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await sb.from("journal_entries").insert({ entry_date: today, body });
      if (error) throw error;
    },
    onError: (_e, body) => {
      setErr("Couldn’t save that entry.");
      setJournal(body);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.journal.all }),
  });

  function addEntry(e: React.FormEvent) {
    e.preventDefault();
    const body = journal.trim();
    if (!body) return;
    setJournal("");
    addEntryMutation.mutate(body);
  }

  const todays = tasks.filter((t) => t.due_date === today);
  const doneToday = todays.filter((t) => t.done).length;
  const pct = todays.length ? Math.round((doneToday / todays.length) * 100) : 0;
  const overdue = tasks.filter((t) => !t.done && t.due_date && t.due_date < today);
  const weekEnd = addDays(today, 7);
  const upcoming = tasks.filter((t) => !t.done && t.due_date && t.due_date > today && t.due_date <= weekEnd);
  const events = useMemo(() => groupEventsByDay(calendarQ.events).get(today) ?? [], [calendarQ.events, today]);
  const latest = (articlesQ.data?.pages[0]?.items ?? []).slice(0, 4);
  const unread = (feedsQ.data ?? []).reduce((sum, f) => sum + f.unread, 0);
  const health = healthQ.days.find((d) => d.day === today) ?? healthQ.days[0];
  const invites = invitesQ.data?.length ?? 0;

  // Same actions as the To-do page: ticking a task here also updates the To-do page's cache, and repeating tasks schedule their next run.
  const toggle = (t: Task) => taskActions.toggle(t);
  function add(e: React.FormEvent) {
    e.preventDefault();
    const v = title.trim();
    if (!v) return;
    setTitle("");
    taskActions.add({ title: v, description: "", due_date: today, priority: 5, list_id: null, recurrence: null });
  }
  const { layout, dragging, handleProps } = useHomeLayout();
  const drag = (id: string, label: string) => <DragHandle label={label} {...handleProps(id)} />;
  const first = name.split(" ")[0];
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const cards: Record<string, ReactNode> = {
    invites:
      invites > 0 ? (
        <Panel
          drag={drag("invites", "Shared journals")}
          icon={faUserGroup}
          title="Shared journals"
          href="/dashboard/journal/collaborate"
          className="max-[900px]:order-2"
        >
          <p className="m-0 text-[13.5px] text-fg-muted">
            {invites} {invites === 1 ? "invitation is" : "invitations are"} waiting for your answer.
          </p>
        </Panel>
      ) : null,
    today: (
      <section aria-label="Today" className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between text-[13.5px] text-fg-subtle tabular-nums">
            <span>
              {doneToday} of {todays.length} tasks done today
            </span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="mt-2" aria-label="Today’s progress" />
        </div>

        <form
          onSubmit={add}
          className="flex h-11 items-center gap-2.5 rounded-r2 bg-raised px-4 shadow-[inset_0_0_0_1px_var(--line-2)] focus-within:shadow-[inset_0_0_0_1px_var(--line-3)]"
        >
          <FA icon={faPlus} className="text-[12px] text-fg-subtle" />
          <Input
            className="h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-[14.5px] focus-visible:ring-0"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a task for today…"
            maxLength={300}
            aria-label="Add a task for today"
          />
        </form>

        <Panel title="Focus" meta={`${overdue.length} overdue · ${todays.length} today`} drag={drag("today", "Today")} className="min-h-[260px]">
          {overdue.length > 0 && (
            <>
              <div className="mb-1 flex items-center gap-1.5 text-[13.5px] text-overdue">
                <FA icon={faChevronDown} className="text-[10px]" /> Overdue
              </div>
              <ul className="m-0 mb-3 list-none p-0">
                {overdue.map((t) => (
                  <TaskRow key={t.id} task={t} today={today} mode="overdue" onToggle={toggle} />
                ))}
              </ul>
            </>
          )}
          <div className="mb-1 flex items-center gap-1.5 text-[13.5px] text-fg-muted">
            <FA icon={faChevronDown} className="text-[10px]" /> Today
          </div>
          <ul className="m-0 list-none p-0">
            {todays.map((t) => (
              <TaskRow key={t.id} task={t} today={today} mode="today" onToggle={toggle} />
            ))}
          </ul>
          {ready && todays.length === 0 && <Empty>No tasks for today</Empty>}
        </Panel>
      </section>
    ),
    journal: (
      <Card aria-label="Today’s journal" className="min-h-[320px] gap-0 max-[900px]:order-3">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <CardTitle className="text-[15.5px] leading-none tracking-[-0.01em]">Today’s journal</CardTitle>
          <span className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="size-7 text-fg-subtle">
              <Link href="/dashboard/journal" aria-label="Open journal">
                <FA icon={faArrowUpRightFromSquare} className="text-[13px]" />
              </Link>
            </Button>
            {drag("journal", "Today’s journal")}
          </span>
        </CardHeader>
        <CardContent className="flex-1">
          {entries.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {entries.map((en) => (
                <li key={en.id} className="flex gap-3 text-[13.5px]">
                  <time className="shrink-0 text-fg-subtle tabular-nums">{fmtTime(en.created_at)}</time>
                  <span className="line-clamp-2 text-fg-muted">{en.body || "Voice or attachment"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 grid h-full min-h-[150px] place-items-center text-center text-[14px] text-fg-subtle">Write your first entry for today</p>
          )}
        </CardContent>
        <form onSubmit={addEntry} className="flex items-center gap-2 border-t p-2">
          <Button asChild variant="secondary" size="icon" className="size-9 rounded-pill text-fg-muted">
            <Link href="/dashboard/journal" aria-label="Record a voice entry">
              <FA icon={faMicrophone} className="text-[14px]" />
            </Link>
          </Button>
          <Input
            className="h-9 min-w-0 flex-1 rounded-none border-0 bg-transparent px-1 text-[14.5px] focus-visible:ring-0"
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
            maxLength={50000}
            placeholder="Start writing…"
            aria-label="New journal entry"
            disabled={!ready}
          />
          {journal.trim() && <Button size="sm">Add</Button>}
        </form>
      </Card>
    ),
    notes: (
      <Panel drag={drag("notes", "Notes")} icon={faPenToSquare} title="Notes" href="/dashboard/notes">
        {notes.length === 0 ? (
          <Empty>No notes yet</Empty>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {notes.map((n) => (
              <li key={n.id}>
                <Link
                  href="/dashboard/notes"
                  className="flex items-baseline justify-between gap-3 rounded-r1 px-2 py-2 text-[13.5px] hover:bg-surface-muted"
                >
                  <span className="truncate">{n.title || "Untitled"}</span>
                  <small className="shrink-0 text-fg-subtle">{ago(n.updated_at)}</small>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    ),
    chats: (
      <Card aria-label="Recent chats" className="min-h-[320px] gap-0 max-[900px]:order-3">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <FA icon={faComment} className="w-3.5 text-[13px] text-fg-subtle" />
          <CardTitle className="text-[15.5px] leading-none tracking-[-0.01em]">Recent chats</CardTitle>
          <span className="ml-auto">{drag("chats", "Chats")}</span>
        </CardHeader>
        <CardContent className="flex-1">
          {ready && chats.length === 0 ? (
            <Empty>No chats yet</Empty>
          ) : (
            <ul className="m-0 list-none p-0">
              {chats.map((c) => (
                <li key={c.id} className="border-b border-line last:border-0">
                  <Link href={`/dashboard/chat?c=${c.id}`} className="flex items-baseline justify-between gap-3 py-2.5 text-[14px] hover:text-fg-muted">
                    <span className="truncate">{c.title}</span>
                    <small className="shrink-0 text-[13px] text-fg-faint">{ago(c.updated_at)}</small>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter className="border-t p-0">
          <Link href="/dashboard/chat?new=1" className="flex w-full items-center gap-2 px-[18px] py-3 text-[14px] text-fg-muted hover:text-fg">
            <FA icon={faPlus} className="text-[12px]" /> New chat
          </Link>
        </CardFooter>
      </Card>
    ),
    insights: <InsightsCard handle={drag("insights", "Personality insights")} />,
    schedule: (
      <Panel
        drag={drag("schedule", "Schedule")}
        title="Upcoming"
        meta="Next 7 days"
        className="max-[900px]:order-2"
      >
        {events.length === 0 && upcoming.length === 0 && <Empty>No tasks for the next 7 days</Empty>}
        {events.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {events.slice(0, 5).map((ev) => (
              <li key={ev.id} className="flex items-baseline gap-3 text-[13.5px]">
                <time className="w-[52px] shrink-0 text-fg-subtle tabular-nums">{ev.all_day ? "All day" : fmtTime(ev.start_at)}</time>
                <span className="truncate">{ev.title}</span>
              </li>
            ))}
          </ul>
        )}
        {upcoming.length > 0 && (
          <>
            <div className="mt-3 mb-1 text-[13px] text-fg-subtle">Due this week</div>
            <ul className="m-0 list-none p-0">
              {upcoming.slice(0, 4).map((t) => (
                <TaskRow key={t.id} task={t} today={today} mode="upcoming" onToggle={toggle} />
              ))}
            </ul>
          </>
        )}
      </Panel>
    ),
    reader: (
      <Panel
        drag={drag("reader", "Reader")}
        icon={faNewspaper}
        title="Reader"
        href="/dashboard/workspace/reader"
        hint={unread > 0 ? `${unread} unread` : undefined}
        className="max-[900px]:order-4"
      >
        {articlesQ.isPending ? (
          <Empty>Loading…</Empty>
        ) : latest.length === 0 ? (
          <Empty>No articles yet. Add a feed in the Reader.</Empty>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {latest.map((a) => (
              <li key={a.id}>
                <Link href="/dashboard/workspace/reader" className="block rounded-r1 px-2 py-2 hover:bg-surface-muted">
                  <span className="line-clamp-2 text-[13.5px] leading-snug text-fg">{a.title}</span>
                  <small className="mt-0.5 block truncate text-[12px] text-fg-subtle">
                    {a.feed_title} · {ago(a.published_at)}
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    ),
    health: (
      <Panel
        drag={drag("health", "Health")}
        icon={faHeartPulse}
        title="Health"
        href="/dashboard/health"
        hint="today"
        className="max-[900px]:order-6"
      >
        {health && (health.steps !== null || health.sleep_minutes !== null) ? (
          <dl className="m-0 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-[12px] text-fg-subtle">Steps</dt>
              <dd className="m-0 font-serif font-semibold text-[26px] leading-tight tracking-[-0.02em]">{(health.steps ?? 0).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-fg-subtle">Sleep</dt>
              <dd className="m-0 font-serif font-semibold text-[26px] leading-tight tracking-[-0.02em]">
                {health.sleep_minutes ? fmtDuration(health.sleep_minutes) : "–"}
              </dd>
            </div>
          </dl>
        ) : (
          <Empty>Connect Health on your phone to see steps and sleep.</Empty>
        )}
      </Panel>
    ),
  };
  /** Cards that share a row in the main column (two across); everything else spans the column. */
  const HALF = new Set(["journal", "chats"]);
  /** One column of cards, each in a wrapper the drag code can measure. */
  const column = (col: HomeColumn) => (
    <div data-home-col={col} className={col === "main" ? "grid min-w-0 grid-cols-2 content-start gap-[18px] max-[900px]:grid-cols-1" : "flex min-w-0 flex-col gap-[18px]"}>
      {layout[col].map((id) =>
        cards[id] ? (
          <div
            key={id}
            data-drag-id={id}
            data-dragging={dragging === id}
            className={`rounded-r3 [&>*]:h-full ${col === "main" && !HALF.has(id) ? "col-span-2 max-[900px]:col-span-1" : ""} transition-[transform,box-shadow] duration-200 ease-(--ease) data-[dragging=true]:relative data-[dragging=true]:z-10 data-[dragging=true]:scale-[1.015] data-[dragging=true]:shadow-e3 data-[dragging=true]:transition-none motion-reduce:transition-none`}
          >
            {cards[id]}
          </div>
        ) : null,
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1040px] pb-16 max-[700px]:pb-24">
      <header className="mt-6 mb-7 max-[700px]:mt-2 max-[700px]:mb-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <h1 className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 font-serif text-[clamp(28px,3vw,32px)] leading-[1.1] font-semibold tracking-[-0.022em] text-balance">
            <span>
              {greeting()}, {first}
            </span>
            {planLabel && (
              <Badge variant="secondary" className="rounded-xs font-normal tracking-normal text-fg-muted">
                {planLabel}
              </Badge>
            )}
          </h1>
          <p className="m-0 pb-1 text-[13.5px] text-fg-subtle">{date}</p>
        </div>
        <nav
          aria-label="Quick actions"
          className="mt-5 flex flex-wrap gap-2 max-[700px]:-mx-3.5 max-[700px]:mt-4 max-[700px]:flex-nowrap max-[700px]:overflow-x-auto max-[700px]:px-3.5 max-[700px]:pb-1 max-[700px]:[scrollbar-width:none]"
        >
          {QUICK.map((q) => (
            <Button key={q.t} asChild variant="outline" size="lg" className="shrink-0 font-normal">
              <Link href={q.href}>
                <FA icon={q.icon} className="text-[12px] text-fg-subtle" /> {q.t}
              </Link>
            </Button>
          ))}
        </nav>
        <HomeTip />
      </header>

      {(err || loadFailed) && (
        <p className="form-err" role="alert">
          {err || "Couldn’t load your workspace. Make sure the database migration has been applied."}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-[18px] max-[900px]:grid-cols-1">
        {column("main")}
        {column("side")}
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowRight,
  faBookOpen,
  faCalendarDays,
  faComment,
  faFire,
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
import QuickAdd, { type QuickAddHandle } from "../../features/home/QuickAdd";
import ProgressRing from "../../features/home/ProgressRing";
import { journalWeek } from "../../features/home/journalWeek";
import { recentItems, type RecentKind } from "../../features/home/recent";
import TaskRow from "./TaskRow";
import InsightsCard from "./InsightsCard";
import HomeTip from "./HomeTip";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

// Stable empty values so a still-loading query doesn't create a new array on every render.

const EMPTY_TASKS: Task[] = [];
const EMPTY_CHATS: Chat[] = [];
const EMPTY_NOTES: Pick<Note, "id" | "title" | "updated_at">[] = [];
const EMPTY_ENTRIES: { id: string; body: string; created_at: string }[] = [];

const KIND: Record<RecentKind, { label: string; icon: IconDefinition; tone: string }> = {
  note: { label: "Note", icon: faPenToSquare, tone: "at-blue" },
  chat: { label: "Chat", icon: faComment, tone: "at-mint" },
  journal: { label: "Journal", icon: faBookOpen, tone: "at-violet" },
};
const FILTERS: { id: RecentKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "note", label: "Notes" },
  { id: "chat", label: "Chats" },
  { id: "journal", label: "Journal" },
];

/** A card on Home: a muted icon, the title, optional quiet text at the right, a way to the full screen, and the drag grip. */
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
        <CardTitle className="text-[15px] leading-none tracking-[-0.01em]">{title}</CardTitle>
        {hint && <small className="text-[13px] text-fg-subtle">{hint}</small>}
        {meta && <small className="ml-auto text-[13px] text-fg-subtle">{meta}</small>}
        {href && (
          <Link href={href} aria-label={`Open ${title}`} className={`ap-icon size-7 text-fg-subtle ${meta ? "" : "ml-auto"}`}>
            <FA icon={faArrowRight} className="text-[12px]" />
          </Link>
        )}
        <span className={href || meta ? "" : "ml-auto"}>{drag}</span>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}


export default function HomeView({ name }: { name: string }) {
  const sb = useMemo(api, []);
  const qc = useQueryClient();
  const today = useMemo(() => isoDate(), []);
  const [err, setErr] = useState("");
  const composer = useRef<QuickAddHandle>(null);
  const [recentFilter, setRecentFilter] = useState<RecentKind | "all">("all");

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
        .limit(6);
      if (error) throw error;
      return data as { id: string; body: string; created_at: string }[];
    },
  });
  const chatsQ = useQuery({
    queryKey: qk.chats.recent,
    queryFn: async () => {
      const { data, error } = await sb.from("chats").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(6);
      if (error) throw error;
      return data as Chat[];
    },
  });
  const notesQ = useQuery({
    queryKey: qk.notes.home,
    queryFn: async () => {
      const { data, error } = await sb.from("notes").select("id,title,updated_at").is("deleted_at", null).order("updated_at", { ascending: false }).limit(6);
      if (error) throw error;
      return data as Pick<Note, "id" | "title" | "updated_at">[];
    },
  });
  // Which of the last seven days have an entry (the journal strip). Dates only, never the text.
  const weekQ = useQuery({
    queryKey: qk.journal.week(today),
    queryFn: async () => {
      const { data, error } = await sb.from("journal_entries").select("entry_date").gte("entry_date", addDays(today, -60)).limit(2000);
      if (error) throw error;
      return (data ?? []).map((r) => r.entry_date as string);
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
    onError: () => setErr("Couldn’t save that entry. Try again."),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.journal.all }),
  });

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
  const addTask = (v: string) => taskActions.add({ title: v, description: "", due_date: today, priority: 5, list_id: null, recurrence: null });
  const { layout, dragging, handleProps } = useHomeLayout();
  const drag = (id: string, label: string) => <DragHandle label={label} {...handleProps(id)} />;
  const first = name.split(" ")[0];
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const recent = recentItems(notes, chats, entries, recentFilter);
  const week = journalWeek(weekQ.data ?? [], today);
  const dayLetter = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" });
  const left = todays.filter((t) => !t.done).length;
  const summary = [
    overdue.length ? `${overdue.length} overdue` : null,
    left ? `${left} left today` : todays.length ? "Today’s to-dos are done" : null,
    upcoming.length ? `${upcoming.length} due this week` : null,
    entries.length ? `${entries.length} journal ${entries.length === 1 ? "entry" : "entries"} today` : null,
  ].filter(Boolean);
  const quiet = "m-0 flex items-center gap-2 py-1 text-[13.5px] text-fg-subtle";

  const cards: Record<string, ReactNode> = {
    invites:
      invites > 0 ? (
        <Panel drag={drag("invites", "Shared journals")} icon={faUserGroup} title="Shared journals" href="/dashboard/journal/collaborate">
          <p className="m-0 text-[13.5px] text-fg-muted">
            {invites} {invites === 1 ? "invitation is" : "invitations are"} waiting for your answer.
          </p>
        </Panel>
      ) : null,
    today: (
      <Card aria-label="Your day" className="gap-0">
        <CardHeader className="flex flex-row items-center gap-2">
          <FA icon={faListCheck} className="w-3.5 text-[13px] text-fg-subtle" />
          <CardTitle className="text-[15px] leading-none tracking-[-0.01em]">Your day</CardTitle>
          <Link href="/dashboard/todo" aria-label="Open To-do" className="ap-icon ml-auto size-7 text-fg-subtle">
            <FA icon={faArrowRight} className="text-[12px]" />
          </Link>
          {drag("today", "Your day")}
        </CardHeader>
        <CardContent className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-6 max-[560px]:grid-cols-1 max-[560px]:justify-items-center">
          <div className="flex flex-col items-center gap-2 pt-1">
            <ProgressRing value={pct}>
              <span className="font-serif text-[26px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{todays.length ? `${pct}%` : "–"}</span>
              <span className="mt-1 block text-[11.5px] text-fg-subtle">{todays.length ? `${doneToday} of ${todays.length}` : "No to-dos"}</span>
            </ProgressRing>
          </div>
          <div className="w-full min-w-0">
            {overdue.length > 0 && (
              <>
                <div className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-overdue">
                  <FA icon={faChevronDown} className="text-[10px]" /> Overdue
                </div>
                <ul className="m-0 mb-3 list-none p-0">
                  {overdue.map((t) => (
                    <TaskRow key={t.id} task={t} today={today} mode="overdue" onToggle={toggle} />
                  ))}
                </ul>
              </>
            )}
            {todays.length > 0 && (
              <>
                <div className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-fg-muted">
                  <FA icon={faChevronDown} className="text-[10px]" /> Due today
                </div>
                <ul className="m-0 list-none p-0">
                  {todays.map((t) => (
                    <TaskRow key={t.id} task={t} today={today} mode="today" onToggle={toggle} />
                  ))}
                </ul>
              </>
            )}
            {ready && todays.length === 0 && overdue.length === 0 && (
              <div className="flex h-full min-h-[112px] flex-col items-start justify-center gap-3">
                <p className="m-0 text-[15px] font-medium text-fg">You’re clear for today.</p>
                <p className="m-0 -mt-1.5 text-[13.5px] text-fg-subtle">Add a to-do above, or plan the day with Naazhi.</p>
                <button type="button" onClick={() => composer.current?.open("task")} className="chip cursor-pointer">
                  <FA icon={faPlus} className="text-[11px]" /> Add a to-do
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    ),
    recent: (
      <Card aria-label="Jump back in" className="gap-0">
        <CardHeader className="flex flex-row flex-wrap items-center gap-x-2 gap-y-3">
          <CardTitle className="text-[15px] leading-none tracking-[-0.01em]">Jump back in</CardTitle>
          <span className="ml-auto flex items-center gap-2">
            <span role="radiogroup" aria-label="Show" className="flex items-center gap-[3px] rounded-ctl bg-hover p-[3px]">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={recentFilter === f.id}
                  onClick={() => setRecentFilter(f.id)}
                  className="h-6 cursor-pointer rounded-tab px-2 text-[12.5px] font-medium text-fg-muted transition-colors duration-(--control) ease-(--ease) hover:text-fg aria-checked:bg-raised aria-checked:text-fg aria-checked:shadow-e1"
                >
                  {f.label}
                </button>
              ))}
            </span>
            {drag("recent", "Jump back in")}
          </span>
        </CardHeader>
        <CardContent className="pt-0">
          {ready && recent.length === 0 ? (
            <p className={`${quiet} py-4`}>
              {recentFilter === "journal" ? "Nothing written today yet." : recentFilter === "chat" ? "No chats yet." : recentFilter === "note" ? "No notes yet." : "Nothing here yet. Write a note or start a chat."}
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {recent.map((r) => (
                <li key={`${r.kind}:${r.id}`}>
                  <Link href={r.href} className="-mx-2 flex items-center gap-3 rounded-r2 px-2 py-2 hover:bg-hover">
                    <span className={`${KIND[r.kind].tone} tint grid size-8 shrink-0 place-items-center rounded-r1 text-[13px]`}>
                      <FA icon={KIND[r.kind].icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-fg">{r.title}</span>
                      <span className="block text-[12.5px] text-fg-subtle">{KIND[r.kind].label}</span>
                    </span>
                    <time className="shrink-0 text-[12.5px] text-fg-faint tabular-nums">{r.kind === "journal" ? fmtTime(r.at) : ago(r.at)}</time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t px-[18px] py-3">
          <Link href="/dashboard/notes?new=1" className="chip">
            <FA icon={faPenToSquare} className="text-[12px]" /> New note
          </Link>
          <Link href="/dashboard/chat?new=1" className="chip">
            <FA icon={faComment} className="text-[12px]" /> New chat
          </Link>
        </CardFooter>
      </Card>
    ),
    journal: (
      <Panel drag={drag("journal", "Journal")} icon={faBookOpen} title="Journal" href="/dashboard/journal" hint={week.streak > 1 ? undefined : "this week"}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="m-0 flex items-center gap-1.5 text-[13.5px] text-fg-muted">
            {week.streak > 1 ? (
              <>
                <FA icon={faFire} className="text-[12px] text-coral" /> {week.streak}-day streak
              </>
            ) : (
              `${week.days.filter((d) => d.wrote).length} of 7 days written`
            )}
          </p>
          <span className="text-[12.5px] text-fg-subtle">{entries.length ? `${entries.length} today` : "Not yet today"}</span>
        </div>
        <ol className="m-0 mt-3 grid list-none grid-cols-7 gap-1.5 p-0" aria-label="The last seven days">
          {week.days.map((d) => (
            <li key={d.date} className="flex flex-col items-center gap-1.5">
              <span className={`text-[11.5px] ${d.today ? "font-semibold text-fg" : "text-fg-subtle"}`} aria-hidden>
                {dayLetter(d.date)}
              </span>
              <span
                title={d.wrote ? "Written" : "Not written"}
                className={`grid aspect-square w-full max-w-8 place-items-center rounded-r1 ${d.wrote ? "bg-fill-dark" : d.today ? "bg-hover shadow-[inset_0_0_0_1.5px_var(--line-3)]" : "bg-hover"}`}
              >
                <span className="sr-only">
                  {new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" })}: {d.wrote ? "written" : "not written"}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => composer.current?.open("journal")} className="chip mt-4 w-full cursor-pointer justify-center">
          <FA icon={faPenToSquare} className="text-[12px]" /> {entries.length ? "Add another entry" : "Write today’s entry"}
        </button>
      </Panel>
    ),
    insights: <InsightsCard handle={drag("insights", "Personality insights")} />,
    schedule: (
      <Panel drag={drag("schedule", "Up next")} icon={faCalendarDays} title="Up next" href="/dashboard/calendar">
        {events.length === 0 && upcoming.length === 0 ? (
          <p className={quiet}>Nothing planned this week.</p>
        ) : (
          <ol className="relative m-0 list-none p-0 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-line">
            {events.slice(0, 4).map((ev) => (
              <li key={ev.id} className="relative flex gap-3 pb-3 pl-6 last:pb-0">
                <span className="absolute top-[7px] left-0 size-[11px] rounded-full bg-fill-dark ring-[3px] ring-raised" aria-hidden />
                <div className="min-w-0">
                  <p className="m-0 truncate text-[14px] text-fg">{ev.title}</p>
                  <p className="m-0 text-[12.5px] text-fg-subtle">Today · {ev.all_day ? "All day" : fmtTime(ev.start_at)}</p>
                </div>
              </li>
            ))}
            {upcoming.slice(0, 4).map((t) => (
              <li key={t.id} className="relative flex gap-3 pb-3 pl-6 last:pb-0">
                <span className="absolute top-[7px] left-0 size-[11px] rounded-full bg-raised ring-[1.5px] ring-line-strong" aria-hidden />
                <div className="min-w-0">
                  <p className="m-0 truncate text-[14px] text-fg">{t.title}</p>
                  <p className="m-0 text-[12.5px] text-fg-subtle">
                    Due {new Date(`${t.due_date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    ),
    reader: (
      <Panel drag={drag("reader", "Reader")} icon={faNewspaper} title="Reader" href="/dashboard/workspace/reader" hint={unread > 0 ? `${unread} unread` : undefined}>
        {articlesQ.isPending ? (
          <p className={quiet}>Loading…</p>
        ) : latest.length === 0 ? (
          <Link href="/dashboard/workspace/reader" className={`${quiet} hover:text-fg`}>
            <FA icon={faPlus} className="text-[11px]" /> Follow a feed to see articles here
          </Link>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {latest.map((a) => (
              <li key={a.id}>
                <Link href="/dashboard/workspace/reader" className="-mx-2 block rounded-r1 px-2 py-2 hover:bg-hover">
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
      <Panel drag={drag("health", "Health")} icon={faHeartPulse} title="Health" href="/dashboard/health" hint="today">
        {health && (health.steps !== null || health.sleep_minutes !== null) ? (
          <dl className="m-0 grid grid-cols-2 gap-3">
            <div>
              <dt className="text-[12px] text-fg-subtle">Steps</dt>
              <dd className="m-0 font-serif text-[26px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">{(health.steps ?? 0).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-fg-subtle">Sleep</dt>
              <dd className="m-0 font-serif text-[26px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">
                {health.sleep_minutes ? fmtDuration(health.sleep_minutes) : "–"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className={quiet}>Connect Health on your phone to see steps and sleep.</p>
        )}
      </Panel>
    ),
  };
  /** One column of cards, each in a wrapper the drag code can measure. */
  const column = (col: HomeColumn) => (
    <div data-home-col={col} className="flex min-w-0 flex-col gap-[18px]">
      {layout[col].map((id) =>
        cards[id] ? (
          <div
            key={id}
            data-drag-id={id}
            data-dragging={dragging === id}
            className={`rounded-r3 transition-[transform,box-shadow] duration-200 ease-(--ease) data-[dragging=true]:relative data-[dragging=true]:z-10 data-[dragging=true]:scale-[1.015] data-[dragging=true]:shadow-e3 data-[dragging=true]:transition-none motion-reduce:transition-none`}
          >
            {cards[id]}
          </div>
        ) : null,
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1080px] pb-16 max-[700px]:pb-24">
      <header className="mt-4 mb-1 max-[700px]:mt-1">
        <p className="m-0 flex items-center gap-2 text-[14px] text-fg-subtle">
          {greeting()}, {first}
          {planLabel && (
            <Badge variant="secondary" className="rounded-xs font-normal tracking-normal text-fg-muted">
              {planLabel}
            </Badge>
          )}
        </p>
        <h1 className="m-0 mt-1 font-serif text-[clamp(30px,4vw,44px)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">{date}</h1>
        <p className="m-0 mt-2 text-[14.5px] text-fg-muted">{summary.length ? summary.join(" · ") : "A clear day. Add something, or ask Naazhi to plan it."}</p>
        <div className="mt-5">
          <QuickAdd ref={composer} today={today} onTask={addTask} onJournal={(body) => addEntryMutation.mutate(body)} disabled={!ready} />
        </div>
      </header>

      <HomeTip />

      {(err || loadFailed) && (
        <p className="form-err" role="alert">
          {err || "Couldn’t load your workspace. Make sure the database migration has been applied."}
        </p>
      )}

      <div className="mt-2 grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-[18px] max-[900px]:grid-cols-1">
        {column("main")}
        {column("side")}
      </div>
    </div>
  );
}

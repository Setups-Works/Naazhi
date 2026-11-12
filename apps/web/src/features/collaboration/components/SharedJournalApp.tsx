"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { canWrite, journalFilePath } from "@untitled/logic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faAlignLeft,
  faArrowLeft,
  faCalendarDays,
  faChevronLeft,
  faChevronRight,
  faListUl,
  faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
import JournalCalendar from "../../../components/app/JournalCalendar";
import SidebarPortal from "../../../components/app/SidebarPortal";
import { useConfirm } from "../../../components/ui/Confirm";
import { setCrumb } from "../../../lib/crumb";
import { addDays, isoDate } from "../../../lib/dates";
import { safeName } from "../../../lib/notes";
import { fmtTime } from "../../../lib/prefs";
import {
  useCollaborationActions,
  useCollaborationRealtime,
  useJournalDay,
  useJournalDays,
  useSharedJournal,
} from "../hooks/useSharedJournals";
import { uploadAttachment, useSignedUrls } from "../hooks/useSignedUrls";
import { monthGrid, parseDay, shiftMonth, streakOf } from "../lib/calendar";
import EntryCard from "./EntryCard";
import EntryComposer from "./EntryComposer";
import ManageDialog from "./ManageDialog";
import PersonAvatar from "./PersonAvatar";
import RolePill from "./RolePill";

/** How many member badges to show before "+n". */
const AVATARS_SHOWN = 5;
const EMPTY_COUNTS: Record<string, number> = {};

type View = "day" | "calendar" | "all";

const dayName = (iso: string, opts: Intl.DateTimeFormatOptions) => parseDay(iso).toLocaleDateString(undefined, opts);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * A shared journal, laid out like the personal journal so the two read as one product: the Day, Calendar and All entries views,
 * the streak, a composer with files and voice (drafts kept per day), and the month and recent days in the sidebar. What differs is
 * that everyone in the journal writes here, so each entry names its author, and viewers can read but not write.
 */
export default function SharedJournalApp({ id }: { id: string }) {
  useCollaborationRealtime();
  const today = useMemo(() => isoDate(), []);
  const [date, setDate] = useState(today);
  const [view, setView] = useState<View>("day");
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [sideMonth, setSideMonth] = useState(() => today.slice(0, 7));
  const [err, setErr] = useState("");
  const [people, setPeople] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const act = useCollaborationActions(setErr);
  const { ask, dialog } = useConfirm();

  const journalQ = useSharedJournal(id);
  const dayQ = useJournalDay(id, date);
  const daysQ = useJournalDays(id);
  const journal = journalQ.data;
  const writer = journal ? canWrite(journal.role) : false;
  const owner = journal?.role === "owner";
  const entries = dayQ.data ?? [];

  // ?d=YYYY-MM-DD opens a day (as in the personal journal).
  const dParam = useSearchParams().get("d");
  useEffect(() => {
    if (dParam && /^\d{4}-\d{2}-\d{2}$/.test(dParam) && dParam <= today) setDate(dParam);
  }, [dParam, today]);
  useEffect(() => setSideMonth(date.slice(0, 7)), [date]);

  const journalName = journal?.name;
  useEffect(() => {
    setCrumb(journalName);
    return () => setCrumb(undefined);
  }, [journalName]);
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(t);
  }, [justSaved]);

  // The days that have writing: entry counts (calendar dots, sidebar, streak) and the first words and photo of each day.
  const counts = useMemo(() => Object.fromEntries((daysQ.data ?? []).map((d) => [d.date, d.count])), [daysQ.data]) as Record<
    string,
    number
  >;
  const previews = useMemo(() => Object.fromEntries((daysQ.data ?? []).map((d) => [d.date, d])), [daysQ.data]);
  const writtenDays = useMemo(
    () =>
      Object.keys(counts)
        .filter((iso) => counts[iso]! > 0)
        .sort()
        .reverse(),
    [counts],
  );
  const recent = useMemo(() => [...new Set([...writtenDays, today, date])].sort().reverse().slice(0, 120), [writtenDays, today, date]);

  // Links for files on screen: the open day's entries, and the photos on the first rows of All entries.
  const thumbPaths = view === "all" ? writtenDays.slice(0, 40).flatMap((iso) => (previews[iso]?.image ? [previews[iso]!.image!] : [])) : [];
  const urls = useSignedUrls([...entries.flatMap((e) => e.attachments.map((a) => a.path)), ...thumbPaths]);

  const send = useCallback(
    async (body: string, files: File[]) => {
      if (!journal) return false;
      setErr("");
      try {
        const attachments = await Promise.all(
          files.map((f) => uploadAttachment(journalFilePath(journal.me, id, crypto.randomUUID(), safeName(f.name)), f)),
        );
        const voiceOnly = !body && attachments.every((a) => a.type.startsWith("audio/"));
        const saved = await act.addEntry(id, { entry_date: date, body, kind: voiceOnly ? "voice" : "text", attachments });
        if (saved) setJustSaved(true);
        return Boolean(saved);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Couldn’t save that entry.");
        return false;
      }
    },
    [act, date, id, journal],
  );

  async function remove(entryId: string, createdAt: string) {
    const yes = await ask({
      title: "Delete this entry?",
      body: <>The entry from {fmtTime(createdAt)} and its attachments will be permanently deleted for everyone.</>,
      confirmLabel: "Delete entry",
      danger: true,
    });
    if (yes) await act.removeEntry(id, entryId);
  }

  const openDay = (iso: string) => {
    setDate(iso);
    setView("day");
  };

  if (journalQ.isError)
    return (
      <div className="mx-auto w-full max-w-[940px]">
        <p className="ap-none">
          This journal doesn’t exist, or you’re not in it.{" "}
          <Link className="underline" href="/dashboard/journal/collaborate">
            Back to Collaboration
          </Link>
        </p>
      </div>
    );

  const n = entries.length;
  const ready = !dayQ.isPending;
  const title = dayName(date, {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(parseDay(date).getFullYear() !== new Date().getFullYear() ? { year: "numeric" as const } : {}),
  });
  const monthDays = writtenDays.filter((iso) => iso.startsWith(month));
  const monthEntries = monthDays.reduce((a, iso) => a + (counts[iso] ?? 0), 0);
  const monthName = dayName(`${month}-01`, { month: "long" });
  const heading = view === "calendar" ? monthName : view === "all" ? "All entries" : title;
  const subline =
    view === "calendar"
      ? `${plural(monthDays.length, "day", "days")} written · ${plural(monthEntries, "entry", "entries")}`
      : view === "all"
        ? "Newest first"
        : ready
          ? `${date === today ? "Today · " : ""}${plural(n, "entry", "entries")}`
          : " ";
  const streak = streakOf(counts, today);
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const grid = monthGrid(month);
  const sideGrid = monthGrid(sideMonth);
  const label = (iso: string) =>
    `${dayName(iso, { weekday: "long", day: "numeric", month: "long" })}${counts[iso] ? `, ${plural(counts[iso]!, "entry", "entries")}` : ""}`;

  return (
    <div className="jr" data-side="false">
      {dialog}
      {people && <ManageDialog id={id} onClose={() => setPeople(false)} />}
      {/* Hidden on a phone: the top bar already holds the (longer) journal name, and the two would overlap. */}
      <span className="jr-status max-sm:hidden" role="status">
        {justSaved ? "Saved" : "Synced"}
      </span>

      <SidebarPortal>
        <aside className="sbt" aria-label="Journal days">
          <section aria-label="Month">
            <div className="mb-2 flex items-center justify-between px-2.5 text-[14.5px]">
              <b className="font-normal">{dayName(`${sideMonth}-01`, { month: "long", year: "numeric" })}</b>
              <span className="flex">
                <button
                  type="button"
                  className="ne-btn"
                  aria-label="Previous month"
                  onClick={() => setSideMonth(shiftMonth(sideMonth, -1))}
                >
                  <FA icon={faChevronLeft} />
                </button>
                <button type="button" className="ne-btn" aria-label="Next month" onClick={() => setSideMonth(shiftMonth(sideMonth, 1))}>
                  <FA icon={faChevronRight} />
                </button>
              </span>
            </div>
            <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] px-1 text-center text-[12px] text-ink-3" aria-hidden>
              {["M", "T", "W", "T", "F", "S", "S"].map((w, i) => (
                <span key={i} className="py-1">
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-[repeat(7,minmax(0,1fr))] gap-y-0.5 px-1 text-center text-[13px]">
              {sideGrid.map((iso) => (
                <button
                  key={iso}
                  type="button"
                  disabled={iso > today}
                  aria-label={label(iso)}
                  aria-current={iso === date ? "date" : undefined}
                  className={`relative mx-auto grid size-8 max-w-full place-items-center rounded-ctl hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent aria-[current=date]:bg-ink aria-[current=date]:text-paper aria-[current=date]:hover:bg-ink ${iso.startsWith(sideMonth) ? (iso > today ? "text-ink-3" : "text-ink") : "text-ink-4"}`}
                  onClick={() => openDay(iso)}
                >
                  {parseDay(iso).getDate()}
                  {(counts[iso] ?? 0) > 0 && iso !== date && <i className="absolute bottom-0.5 size-1 rounded-full bg-ink-3" aria-hidden />}
                </button>
              ))}
            </div>
          </section>
          <h3 className="m-0 mt-5 mb-1 px-2.5 text-[12px] font-medium text-ink-4">Recent</h3>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {recent.map((iso) => (
              <li key={iso}>
                <button
                  type="button"
                  className="sbt-item"
                  data-on={iso === date}
                  aria-current={iso === date ? "date" : undefined}
                  onClick={() => openDay(iso)}
                >
                  <span>{iso === today ? "Today" : dayName(iso, { weekday: "short", month: "short", day: "numeric" })}</span>
                  {(counts[iso] ?? 0) > 0 && <em>{counts[iso]}</em>}
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </SidebarPortal>

      <section className="jr-main ap-card" aria-label={journal?.name ?? "Shared journal"}>
        <header className="jr-head">
          {/* Which journal this is, who is in it, and the way back: the one thing a shared journal adds to the personal layout. */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard/journal/collaborate"
                className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-fg-muted transition-colors hover:text-fg"
              >
                <FA icon={faArrowLeft} aria-hidden /> Collaboration
              </Link>
              <span aria-hidden className="text-fg-faint">
                /
              </span>
              <b className="truncate text-[14px] font-medium">{journal?.name ?? " "}</b>
            </div>
            {journal && (
              <div className="flex items-center gap-3">
                <RolePill role={journal.role} />
                {/* Not a <ul>: the card's global "ap-card ul" rule would stack the avatars in a column. */}
                <div className="flex items-center -space-x-2" role="group" aria-label={`${journal.members.length} people`}>
                  {journal.members.slice(0, AVATARS_SHOWN).map((m) => (
                    <span key={m.person.id} className="flex rounded-full ring-2 ring-raised">
                      <PersonAvatar person={m.person} size="sm" />
                    </span>
                  ))}
                </div>
                {journal.members.length > AVATARS_SHOWN && (
                  <span className="text-[12.5px] text-fg-subtle">+{journal.members.length - AVATARS_SHOWN}</span>
                )}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPeople(true)}>
                  <FA icon={faUserGroup} aria-hidden /> {owner ? "Manage" : "People"}
                </button>
              </div>
            )}
          </div>
          <div className="jr-head-nav">
            {view !== "all" && (
              <>
                <button
                  className="jc-btn"
                  aria-label={view === "calendar" ? "Previous month" : "Previous day"}
                  onClick={() => (view === "calendar" ? setMonth(shiftMonth(month, -1)) : setDate(addDays(date, -1)))}
                >
                  <FA icon={faChevronLeft} />
                </button>
                <button
                  className="jc-btn"
                  aria-label={view === "calendar" ? "Next month" : "Next day"}
                  disabled={view === "calendar" ? false : date >= today}
                  onClick={() => (view === "calendar" ? setMonth(shiftMonth(month, 1)) : setDate(addDays(date, 1)))}
                >
                  <FA icon={faChevronRight} />
                </button>
                {view === "day" && date !== today && (
                  <button type="button" className="tv-today" onClick={() => setDate(today)}>
                    Today
                  </button>
                )}
              </>
            )}
            <span className="ml-auto flex items-center gap-1">
              <JournalCalendar value={date} today={today} counts={counts ?? EMPTY_COUNTS} onPick={setDate} />
            </span>
          </div>
          <h1 className="jr-title">{heading}</h1>
          <small>{subline}</small>
        </header>

        <div className="tdo-bar">
          <div className="tdo-tabs" role="group" aria-label="Journal view">
            {(
              [
                ["day", "Day", faAlignLeft],
                ["calendar", "Calendar", faCalendarDays],
                ["all", "All entries", faListUl],
              ] as const
            ).map(([k, text, icon]) => (
              <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>
                <FA icon={icon} /> {text}
              </button>
            ))}
          </div>
          <div className="tdo-tools" aria-label={`${streak} day streak`}>
            <span className="flex gap-[3px] max-[1000px]:hidden" aria-hidden>
              {last14.map((iso) => (
                <i key={iso} className={`size-2.5 rounded-[2px] ${(counts[iso] ?? 0) > 0 ? "bg-ink" : "bg-hover"}`} />
              ))}
            </span>
            <span className="text-[13px] whitespace-nowrap text-fg-subtle">{streak > 0 ? `${streak} day streak` : "No streak yet"}</span>
          </div>
        </div>

        {view === "calendar" && (
          <div className="jr-cal" role="grid" aria-label="Calendar">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
              <span key={w} role="columnheader" className="jr-cal-h">
                {w}
              </span>
            ))}
            {grid.map((iso) => {
              const peek = previews[iso]?.body;
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  className="jr-cal-d"
                  data-out={!iso.startsWith(month)}
                  data-today={iso === today}
                  disabled={iso > today}
                  aria-label={label(iso)}
                  onClick={() => openDay(iso)}
                >
                  <span className="jr-cal-n">
                    <b>{parseDay(iso).getDate()}</b>
                    {(counts[iso] ?? 0) > 0 && <small>{counts[iso]}</small>}
                  </span>
                  {peek && <span className="jr-cal-p">{peek}</span>}
                </button>
              );
            })}
          </div>
        )}

        {view === "all" && (
          <ul className="jr-all" aria-label="All entries">
            {writtenDays.map((iso) => {
              const pv = previews[iso];
              const thumb = pv?.image ? urls[pv.image] : undefined;
              return (
                <li key={iso}>
                  <button type="button" onClick={() => openDay(iso)}>
                    <span className="jr-all-d">
                      <b>{iso === today ? "Today" : dayName(iso, { weekday: "short", month: "short", day: "numeric" })}</b>
                      <small>{plural(counts[iso] ?? 0, "entry", "entries")}</small>
                    </span>
                    <span className="jr-all-p">{pv?.body || (pv?.image ? "Photo" : "")}</span>
                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element -- a small signed-link thumbnail
                      <img src={thumb} alt="" className="jr-all-t" />
                    )}
                  </button>
                </li>
              );
            })}
            {!daysQ.isPending && writtenDays.length === 0 && <li className="jr-all-none">No entries yet.</li>}
          </ul>
        )}

        {view === "day" && (
          <>
            <div className="jr-list flex flex-col" aria-live="polite">
              {ready && n === 0 && (
                <div className="jr-empty">
                  {/* Line drawing of a notebook and a plant, in the ink colour (as in the personal journal). */}
                  <svg
                    viewBox="0 0 170 80"
                    width="170"
                    height="80"
                    aria-hidden
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  >
                    <path d="M4 76h162" />
                    <rect x="40" y="2" width="32" height="74" rx="2" transform="translate(28 0)" />
                    <path d="M76 18h18M76 26h18M76 34h12" />
                    <circle cx="26" cy="68" r="8" />
                    <path d="M26 60c0-10 6-16 14-16" />
                    <path d="M124 76V40a8 8 0 0 1 16 0v36" />
                    <path d="M132 32c0-10 4-18 12-24-1 9-4 16-12 24Z" />
                  </svg>
                  <b>{date === today ? "No entries yet today" : "No entries this day"}</b>
                  <span>{writer ? "Start writing below." : "Nothing has been written here yet."}</span>
                </div>
              )}
              {entries.map((e) => {
                const mine = e.author.id === journal?.me;
                return (
                  <EntryCard
                    key={e.id}
                    entry={e}
                    urls={urls}
                    canEdit={mine && writer}
                    canDelete={(mine && writer) || owner}
                    onSave={async (body) => Boolean(await act.editEntry(id, e.id, { body }))}
                    onDelete={() => void remove(e.id, e.created_at)}
                  />
                );
              })}
            </div>

            {err && (
              <p className="form-err jr-err" role="alert">
                {err}
              </p>
            )}
            {writer ? (
              <EntryComposer onSend={send} draftKey={`shared-journal:${id}:${date}`} showTime={date === today} />
            ) : (
              journal && (
                <p className="jr-compose text-[13.5px] text-fg-subtle">
                  You can read this journal. Only editors and the owner can write in it.
                </p>
              )
            )}
          </>
        )}
      </section>
    </div>
  );
}

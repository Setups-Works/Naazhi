"use client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faAlignLeft,
  faArrowUp,
  faCalendarDays,
  faListUl,
  faChevronLeft,
  faChevronRight,
  faEllipsis,
  faPaperclip,
  faTableColumns,
  faCopy,
  faTrash,
  faShareNodes,
} from "@fortawesome/free-solid-svg-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api/client";
import { qk } from "../../lib/query/keys";
import { useRealtimeInvalidate } from "../../hooks/useRealtimeInvalidate";
import { addDays, isoDate } from "../../lib/dates";
import { fmtTime } from "../../lib/prefs";
import { safeName, TONES } from "../../lib/notes";
import type { Attachment, Entry } from "../../lib/workspace";
import Markdown from "./Markdown";
import JournalCalendar from "./JournalCalendar";
import { useConfirm } from "../ui/Confirm";
import Menu, { MenuItem } from "../ui/Menu";
import FilePreviewList from "../ui/FilePreviewList";
import AttachmentImage from "../ui/AttachmentImage";
import AudioWave from "../ui/AudioWave";
import RecordButton from "../ui/RecordButton";
import { useDraftFiles, useDraftText } from "../../hooks/useDraft";
import { useRecorder } from "./useRecorder";
import SidebarPortal from "./SidebarPortal";
import { setCrumb } from "../../lib/crumb";
import { ctxProps, useCtxActions } from "../../lib/context-actions";
import { ShareDayDialog, ShareEntryDialog } from "../../features/journal";

const COLS = "id,entry_date,body,created_at,updated_at,kind,attachments,share_token";
const DAY_TONES = TONES.filter((t) => t !== "sand");
/** A stable colour for a date (its day-of-month picks the tint), so neighbouring days differ and a date never changes colour. */
const dayTone = (iso: string) => DAY_TONES[Number(iso.slice(8, 10)) % DAY_TONES.length];
/** "5 M", "3 H", "2 D", "1 W": how long ago an entry was written, in the quiet mono style of the card header. */
function shortAge(iso: string) {
  const m = Math.max(0, (Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${Math.floor(m)} M`;
  if (m < 1440) return `${Math.floor(m / 60)} H`;
  if (m < 10_080) return `${Math.floor(m / 1440)} D`;
  return `${Math.floor(m / 10_080)} W`;
}
const EMPTY_ENTRIES: Entry[] = []; // stable references while a query loads
const EMPTY_COUNTS: Record<string, number> = {};
const EMPTY_PREVIEWS: Record<string, { body: string; img?: string }> = {};
const MAX_BYTES = 10 * 1024 * 1024;
const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export default function JournalView() {
  const sb = useMemo(api, []);
  const today = useMemo(() => isoDate(), []);
  const { ask, dialog } = useConfirm();
  const [date, setDate] = useState(today);
  // Day (write), Calendar (month grid) or All entries (every day that has writing), as tabs under the title.
  const [view, setView] = useState<"day" | "calendar" | "all">("day");
  const [month, setMonth] = useState(() => today.slice(0, 7));
  // The sidebar's own month, so it can be paged without moving the Calendar view; it follows the open day.
  const [sideMonth, setSideMonth] = useState(() => today.slice(0, 7));
  // ?d=YYYY-MM-DD jumps to a day (used by universal search).
  const dParam = useSearchParams().get("d");
  useEffect(() => {
    if (dParam && /^\d{4}-\d{2}-\d{2}$/.test(dParam) && dParam <= today) setDate(dParam);
  }, [dParam, today]);
  const qc = useQueryClient();
  const [err, setErr] = useState("");
  // The day list is closed by default (the page reads as one centred column); it opens beside the entries when asked for.
  const [side, setSide] = useState(false);
  useEffect(() => {
    try {
      setSide(window.localStorage.getItem("up_journal_sidebar") === "true");
    } catch {
      /* storage unavailable: stay open */
    }
  }, []);
  const toggleSide = () => {
    setSide(!side);
    try {
      window.localStorage.setItem("up_journal_sidebar", String(!side));
    } catch {
      /* ignore */
    }
  };
  // Unsent text, attachments and voice recordings are kept per day, so a refresh doesn't lose them.
  const [text, setText] = useDraftText(`journal:${date}`);
  const [files, setFiles] = useDraftFiles(`journal:${date}`);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [sharing, setSharing] = useState<Entry | null>(null);
  const [sharingDay, setSharingDay] = useState(false);
  const [draft, setDraft] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const uid = useRef("");
  const ta = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);

  // Two cached queries: how many entries each day has (calendar dots, day list) and the selected day's entries.
  // Switching back to a day you've already opened is instant; changes elsewhere (another tab) arrive via realtime.
  const countsQ = useQuery({
    queryKey: qk.journal.counts,
    queryFn: async () => {
      const { data, error } = await sb.from("journal_entries").select("entry_date").limit(5000);
      if (error) throw error;
      const c: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        c[r.entry_date as string] = (c[r.entry_date as string] || 0) + 1;
      });
      return c;
    },
  });
  const dayQ = useQuery({
    queryKey: qk.journal.day(date),
    queryFn: async () => {
      const { data, error } = await sb.from("journal_entries").select(COLS).eq("entry_date", date).order("created_at");
      if (error) throw error;
      return data as Entry[];
    },
  });
  // First entry of each day (its text, and a photo if it has one), for the Calendar cells and the All entries rows.
  const previewsQ = useQuery({
    queryKey: [...qk.journal.all, "previews"],
    queryFn: async () => {
      const { data, error } = await sb.from("journal_entries").select("entry_date,body,attachments,created_at").order("created_at").limit(5000);
      if (error) throw error;
      const by: Record<string, { body: string; img?: string }> = {};
      (data ?? []).forEach((r) => {
        const iso = r.entry_date as string;
        const img = (Array.isArray(r.attachments) ? (r.attachments as Attachment[]) : []).find((a) => a.type.startsWith("image/"))?.path;
        const cur = by[iso];
        if (!cur) by[iso] = { body: ((r.body as string) ?? "").trim(), img };
        else {
          if (!cur.body && r.body) cur.body = (r.body as string).trim();
          if (!cur.img && img) cur.img = img;
        }
      });
      return by;
    },
  });
  const previews = previewsQ.data ?? EMPTY_PREVIEWS;
  const counts = countsQ.data ?? EMPTY_COUNTS;
  const entries = dayQ.data ?? EMPTY_ENTRIES;
  const ready = !dayQ.isPending;
  const loadCounts = useCallback(() => qc.invalidateQueries({ queryKey: qk.journal.counts }), [qc]);
  const loadDay = useCallback(() => qc.invalidateQueries({ queryKey: qk.journal.day(date) }), [qc, date]);
  useRealtimeInvalidate("journal_entries", [qk.journal.all]);
  useEffect(() => {
    setErr(dayQ.isError ? "Couldn’t load your journal." : "");
  }, [dayQ.isError]);

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => {
      uid.current = data.user?.id ?? "";
    });
  }, [sb]);
  useEffect(() => {
    setEditing(null);
  }, [date]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [entries.length]);

  const paths = entries.flatMap((e) => e.attachments.map((a) => a.path)).join("|");
  useEffect(() => {
    if (!paths) return setUrls({});
    let live = true;
    sb.storage
      .from("note-files")
      .createSignedUrls(paths.split("|"), 3600)
      .then(({ data }) => {
        if (live && data)
          setUrls(Object.fromEntries(data.filter((d) => d.path && d.signedUrl).map((d) => [d.path as string, d.signedUrl as string])));
      });
    return () => {
      live = false;
    };
  }, [sb, paths]);

  // Small photos on the All entries rows (the newest 40 days that have one).
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const thumbPaths = Object.keys(previews)
    .sort()
    .reverse()
    .map((iso) => previews[iso].img)
    .filter((p): p is string => !!p)
    .slice(0, 40)
    .join("|");
  useEffect(() => {
    if (view !== "all" || !thumbPaths) return;
    let live = true;
    sb.storage
      .from("note-files")
      .createSignedUrls(thumbPaths.split("|"), 3600)
      .then(({ data }) => {
        if (live && data) setThumbs(Object.fromEntries(data.filter((d) => d.path && d.signedUrl).map((d) => [d.path as string, d.signedUrl as string])));
      });
    return () => {
      live = false;
    };
  }, [sb, view, thumbPaths]);
  // "Saved" for a moment after writing an entry, otherwise "Synced".
  const [justSaved, setJustSaved] = useState(false);
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 3000);
    return () => clearTimeout(t);
  }, [justSaved]);

  const rec = useRecorder((blob, type, secs) => {
    const ext = type.includes("mp4") ? "m4a" : "webm";
    setFiles((f) => [...f, new File([blob], `voice-note-${secs}s.${ext}`, { type })]);
  }, setErr);

  const addFiles = (list: FileList | null) => {
    const ok = Array.from(list ?? []).filter((f) => f.size <= MAX_BYTES);
    if ((list?.length ?? 0) > ok.length) setErr("Files can be up to 10 MB.");
    setFiles((f) => [...f, ...ok]);
  };

  async function send() {
    const body = text.trim();
    if ((!body && !files.length) || busy) return;
    setBusy(true);
    setErr("");
    const voiceOnly = !body && files.every((f) => f.type.startsWith("audio/"));
    const { data, error } = await sb
      .from("journal_entries")
      .insert({ entry_date: date, body, kind: voiceOnly ? "voice" : "text" })
      .select(COLS)
      .single();
    if (error || !data) {
      setErr("Couldn’t save that entry.");
      return setBusy(false);
    }
    if (files.length) {
      const atts: Attachment[] = [];
      for (const f of files) {
        const path = `${uid.current}/journal/${data.id}/${crypto.randomUUID()}-${safeName(f.name)}`;
        const { error: up } = await sb.storage.from("note-files").upload(path, f, { contentType: f.type || "application/octet-stream" });
        if (up) setErr(`Couldn’t upload ${f.name}.`);
        else atts.push({ path, name: f.name, type: f.type || "application/octet-stream", size: f.size });
      }
      if (atts.length) await sb.from("journal_entries").update({ attachments: atts }).eq("id", data.id);
    }
    setText("");
    setFiles([]);
    if (ta.current) ta.current.style.height = "";
    setBusy(false);
    await Promise.all([loadDay(), loadCounts()]);
    qc.invalidateQueries({ queryKey: [...qk.journal.all, "previews"] });
    setJustSaved(true);
  }

  async function saveEdit(e: Entry) {
    const body = draft.trim();
    if (!body && !e.attachments.length) return setEditing(null);
    const { error } = await sb.from("journal_entries").update({ body, updated_at: new Date().toISOString() }).eq("id", e.id);
    if (error) return setErr("Couldn’t save that change.");
    setEditing(null);
    loadDay();
  }

  async function remove(e: Entry) {
    const yes = await ask({
      title: "Delete this entry?",
      body: <>The entry from {fmtTime(e.created_at)} and its attachments will be permanently deleted.</>,
      confirmLabel: "Delete entry",
      danger: true,
    });
    if (!yes) return;
    if (e.attachments.length) await sb.storage.from("note-files").remove(e.attachments.map((a) => a.path));
    const { error } = await sb.from("journal_entries").delete().eq("id", e.id);
    if (error) return setErr("Couldn’t delete that entry.");
    await Promise.all([loadDay(), loadCounts()]);
  }

  // Right-click actions on a journal entry (see lib/context-actions).
  useCtxActions("entry", (id, action) => {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    if (action === "edit") {
      setEditing(e.id);
      setDraft(e.body);
    } else if (action === "delete") void remove(e);
  });

  const days = useMemo(() => {
    const set = new Set([...Object.keys(counts), today, date]);
    return [...set].sort().reverse().slice(0, 120);
  }, [counts, today, date]);

  const d = parse(date);
  const title = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
  });
  const n = entries.length;
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  // Consecutive days with writing, counted back from today (yesterday still counts while today is empty).
  let streak = 0;
  for (let iso = counts[today] > 0 ? today : addDays(today, -1); counts[iso] > 0; iso = addDays(iso, -1)) streak++;
  // Month grid for the Calendar view, Monday first: whole weeks, with the neighbouring months' days at the edges.
  const monthGrid: string[] = (() => {
    const first = `${month}-01`;
    const lead = (parse(first).getDay() + 6) % 7;
    const length = new Date(parse(first).getFullYear(), parse(first).getMonth() + 1, 0).getDate();
    const rows = Math.ceil((lead + length) / 7);
    return Array.from({ length: rows * 7 }, (_, i) => addDays(first, i - lead));
  })();
  const shiftMonth = (m: string, by: number) => {
    const [y, mo] = m.split("-").map(Number);
    const dt = new Date(y, mo - 1 + by, 1);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
  };
  useEffect(() => {
    setSideMonth(date.slice(0, 7));
  }, [date]);
  const sideGrid = (() => {
    const first = `${sideMonth}-01`;
    const lead = (parse(first).getDay() + 6) % 7;
    const length = new Date(parse(first).getFullYear(), parse(first).getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((lead + length) / 7) * 7 }, (_, i) => addDays(first, i - lead));
  })();
  const monthDays = Object.keys(counts).filter((iso) => iso.startsWith(month) && counts[iso] > 0);
  const monthEntries = monthDays.reduce((a, iso) => a + counts[iso], 0);
  const monthName = parse(`${month}-01`).toLocaleDateString(undefined, { month: "long" });
  const heading = view === "calendar" ? monthName : view === "all" ? "All entries" : title;
  const subline =
    view === "calendar"
      ? `${monthDays.length} ${monthDays.length === 1 ? "day" : "days"} written · ${monthEntries} ${monthEntries === 1 ? "entry" : "entries"}`
      : view === "all"
        ? "Newest first"
        : ready
          ? `${date === today ? "Today · " : ""}${n} ${n === 1 ? "entry" : "entries"}`
          : " ";
  const crumbLabel =
    view === "calendar"
      ? parse(`${month}-01`).toLocaleDateString(undefined, { month: "long", year: "numeric" })
      : view === "all"
        ? "All entries"
        : parse(date).toLocaleDateString(undefined, { month: "long", day: "numeric" });
  useEffect(() => {
    setCrumb(crumbLabel);
    return () => setCrumb(undefined);
  }, [crumbLabel]);
  const canSend = (text.trim() || files.length) && !busy;

  return (
    <div className="jr" data-side="false">
      {dialog}
      <span className="jr-status" role="status">
        {justSaved ? "Saved" : "Synced"}
      </span>
      {sharingDay && <ShareDayDialog date={date} heading={title} onClose={() => setSharingDay(false)} />}
      {sharing && <ShareEntryDialog key={sharing.id} entry={sharing} onClose={() => setSharing(null)} />}
      <SidebarPortal>
        <aside className="sbt" aria-label="Journal days">
          {/* A month at a glance: pick a day to open it. */}
          <section aria-label="Month">
            <div className="mb-2 flex items-center justify-between px-2.5 text-[14.5px]">
              <b className="font-normal">{parse(`${sideMonth}-01`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</b>
              <span className="flex">
                <button type="button" className="ne-btn" aria-label="Previous month" onClick={() => setSideMonth(shiftMonth(sideMonth, -1))}>
                  <FA icon={faChevronLeft} />
                </button>
                <button type="button" className="ne-btn" aria-label="Next month" onClick={() => setSideMonth(shiftMonth(sideMonth, 1))}>
                  <FA icon={faChevronRight} />
                </button>
              </span>
            </div>
            <div className="grid grid-cols-7 px-1 text-center text-[12px] text-ink-3" aria-hidden>
              {["M", "T", "W", "T", "F", "S", "S"].map((w, i) => (
                <span key={i} className="py-1">
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5 px-1 text-center text-[13px]">
              {sideGrid.map((iso) => (
                <button
                  key={iso}
                  type="button"
                  disabled={iso > today}
                  aria-label={`${parse(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}${counts[iso] ? `, ${counts[iso]} ${counts[iso] === 1 ? "entry" : "entries"}` : ""}`}
                  aria-current={iso === date ? "date" : undefined}
                  className={`relative mx-auto grid size-8 place-items-center rounded-ctl hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent aria-[current=date]:bg-ink aria-[current=date]:text-paper aria-[current=date]:hover:bg-ink ${iso.startsWith(sideMonth) ? (iso > today ? "text-ink-3" : "text-ink") : "text-ink-4"}`}
                  onClick={() => {
                    setDate(iso);
                    setView("day");
                  }}
                >
                  {parse(iso).getDate()}
                  {counts[iso] > 0 && iso !== date && <i className="absolute bottom-0.5 size-1 rounded-full bg-ink-3" aria-hidden />}
                </button>
              ))}
            </div>
          </section>
          <h3 className="m-0 mt-5 mb-1 px-2.5 text-[12px] font-medium text-ink-4">Recent</h3>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {days.map((iso) => {
              const dd = parse(iso);
              return (
                <li key={iso}>
                  <button
                    type="button"
                    className="sbt-item"
                    data-on={iso === date}
                    aria-current={iso === date ? "date" : undefined}
                    onClick={() => {
                      setDate(iso);
                      setView("day");
                    }}
                  >
                    <span>{iso === today ? "Today" : dd.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                    {counts[iso] > 0 && <em>{counts[iso]}</em>}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </SidebarPortal>

      <section className="jr-main ap-card" aria-label={title}>
        <header className="jr-head">
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
              {view === "day" && (
                <button type="button" className="jc-btn" aria-label="Share this day" title="Share this day" disabled={entries.length === 0} onClick={() => setSharingDay(true)}>
                  <FA icon={faShareNodes} />
                </button>
              )}
              <JournalCalendar value={date} today={today} counts={counts} onPick={setDate} />
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
            ).map(([k, label, icon]) => (
              <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)}>
                <FA icon={icon} /> {label}
              </button>
            ))}
          </div>
          <div className="tdo-tools" aria-label={`${streak} day streak`}>
            <span className="flex gap-[3px]" aria-hidden>
              {last14.map((iso) => (
                <i key={iso} className={`size-2.5 rounded-[2px] ${counts[iso] > 0 ? "bg-ink" : "bg-hover"}`} />
              ))}
            </span>
            <span className="text-[13px] text-fg-subtle">{streak > 0 ? `${streak} day streak` : "No streak yet"}</span>
          </div>
        </div>

        {view === "calendar" && (
          <div className="jr-cal" role="grid" aria-label="Calendar">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
              <span key={w} role="columnheader" className="jr-cal-h">
                {w}
              </span>
            ))}
            {monthGrid.map((iso) => {
              const inMonth = iso.startsWith(month);
              const peek = previews[iso]?.body;
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  className="jr-cal-d"
                  data-out={!inMonth}
                  data-today={iso === today}
                  disabled={iso > today}
                  aria-label={`${parse(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}${counts[iso] ? `, ${counts[iso]} ${counts[iso] === 1 ? "entry" : "entries"}` : ""}`}
                  onClick={() => {
                    setDate(iso);
                    setView("day");
                  }}
                >
                  <span className="jr-cal-n">
                    <b>{parse(iso).getDate()}</b>
                    {counts[iso] > 0 && <small>{counts[iso]}</small>}
                  </span>
                  {peek && <span className="jr-cal-p">{peek}</span>}
                </button>
              );
            })}
          </div>
        )}

        {view === "all" && (
          <ul className="jr-all" aria-label="All entries">
            {Object.keys(counts)
              .filter((iso) => counts[iso] > 0)
              .sort()
              .reverse()
              .map((iso) => {
                const pv = previews[iso];
                const thumb = pv?.img ? thumbs[pv.img] : undefined;
                return (
                  <li key={iso}>
                    <button
                      type="button"
                      onClick={() => {
                        setDate(iso);
                        setView("day");
                      }}
                    >
                      <span className="jr-all-d">
                        <b>{iso === today ? "Today" : parse(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</b>
                        <small>
                          {counts[iso]} {counts[iso] === 1 ? "entry" : "entries"}
                        </small>
                      </span>
                      <span className="jr-all-p">{pv?.body || (pv?.img ? "Photo" : "")}</span>
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="jr-all-t" />
                      )}
                    </button>
                  </li>
                );
              })}
            {Object.values(counts).every((c) => !c) && <li className="jr-all-none">No entries yet.</li>}
          </ul>
        )}

        {view === "day" && (
          <>
        <div className="jr-list flex flex-col" aria-live="polite">
          {ready && n === 0 && (
            <div className="jr-empty">
              {/* Line drawing of a notebook and a plant, in the ink colour. */}
              <svg viewBox="0 0 170 80" width="170" height="80" aria-hidden fill="none" stroke="var(--ink)" strokeWidth="1.3" strokeLinecap="round">
                <path d="M4 76h162" />
                <rect x="40" y="2" width="32" height="74" rx="2" transform="translate(28 0)" />
                <path d="M76 18h18M76 26h18M76 34h12" />
                <circle cx="26" cy="68" r="8" />
                <path d="M26 60c0-10 6-16 14-16" />
                <path d="M124 76V40a8 8 0 0 1 16 0v36" />
                <path d="M132 32c0-10 4-18 12-24-1 9-4 16-12 24Z" />
              </svg>
              <b>{date === today ? "No entries yet today" : "No entries this day"}</b>
              <span>Start writing below.</span>
            </div>
          )}
          {entries.map((e) => {
            const hasPhoto = e.attachments.some((a) => a.type.startsWith("image/"));
            const hasVoice = !hasPhoto && e.attachments.some((a) => a.type.startsWith("audio/"));
            return (
              <article key={e.id} className="jr-row" {...ctxProps("entry", e.id)}>
                <div className="jr-row-t">
                  <time dateTime={e.created_at}>{fmtTime(e.created_at)}</time>
                  {(hasPhoto || hasVoice) && <small>{hasPhoto ? "Photo" : "Voice"}</small>}
                </div>
                <div className="jr-row-b">
                  {editing === e.id ? (
                    <div className="jr-edit">
                      <textarea
                        autoFocus
                        value={draft}
                        onChange={(x) => setDraft(x.target.value)}
                        maxLength={50000}
                        aria-label="Edit entry"
                        onKeyDown={(x) => {
                          if ((x.metaKey || x.ctrlKey) && x.key === "Enter") saveEdit(e);
                          if (x.key === "Escape") setEditing(null);
                        }}
                      />
                      <div>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>
                          Cancel
                        </button>{" "}
                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(e)}>
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    e.body && (
                      <div className="jr-row-text">
                        <Markdown text={e.body} />
                      </div>
                    )
                  )}
                  {e.attachments.length > 0 && (
                    <ul className="jr-files">
                      {e.attachments.map((a) => {
                        const u = urls[a.path];
                        return (
                          <li key={a.path}>
                            {u && a.type.startsWith("image/") && <AttachmentImage src={u} name={a.name} />}
                            {u && a.type.startsWith("audio/") && <AudioWave src={u} label={a.name} />}
                            {!a.type.startsWith("image/") &&
                              !a.type.startsWith("audio/") &&
                              (u ? (
                                <a href={u} target="_blank" rel="noopener noreferrer">
                                  <FA icon={faPaperclip} /> {a.name}
                                </a>
                              ) : (
                                <span>{a.name}</span>
                              ))}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="jr-row-a">
                  {e.body && (
                    <button type="button" className="ne-btn" aria-label="Copy entry" title="Copy" onClick={() => void navigator.clipboard.writeText(e.body).catch(() => setErr("Couldn’t copy that entry."))}>
                      <FA icon={faCopy} />
                    </button>
                  )}
                  <button type="button" className="ne-btn" aria-label="Delete entry" title="Delete" onClick={() => remove(e)}>
                    <FA icon={faTrash} />
                  </button>
                  <Menu label="Entry options" trigger={<FA icon={faEllipsis} />}>
                    <MenuItem
                      onSelect={() => {
                        setEditing(e.id);
                        setDraft(e.body);
                      }}
                    >
                      Edit
                    </MenuItem>
                    <MenuItem onSelect={() => setSharing(e)}>Share</MenuItem>
                  </Menu>
                </div>
              </article>
            );
          })}
          <div ref={end} />
        </div>

        {err && (
          <p className="form-err jr-err" role="alert">
            {err}
          </p>
        )}

        <form
          className="jr-compose"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <span className="jr-now" aria-hidden>
            {date === today ? fmtTime(new Date().toISOString()) : ""}
          </span>
          <FilePreviewList label="Attachments to add" files={files} onRemove={(i) => setFiles((x) => x.filter((_, j) => j !== i))} />
          <textarea
            ref={ta}
            value={text}
            rows={2}
            maxLength={50000}
            placeholder="Start writing…"
            aria-label="New journal entry"
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
            }}
            onKeyDown={(e) => {
              // Enter saves, Shift+Enter starts a new line (⌘/Ctrl+Enter still saves). Never while an IME is composing.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="jr-bar">
            <button type="button" className="jr-pill" onClick={() => file.current?.click()}>
              <FA icon={faPaperclip} /> Attach
            </button>
            <RecordButton variant="pill" recording={rec.recording} secs={rec.secs} onToggle={rec.toggle} />
            <input
              ref={file}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <small className="jr-hint">Enter to save · Shift+Enter for a new line</small>
            <button className="jr-send" disabled={!canSend} aria-label="Add entry" title="Add entry (Enter)">
              <FA icon={faArrowUp} />
            </button>
          </div>
        </form>
          </>
        )}
      </section>
    </div>
  );
}

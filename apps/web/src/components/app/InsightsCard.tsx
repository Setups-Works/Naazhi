"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faCalendarDay,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faClock,
  faFaceSmile,
  faFire,
  faPenNib,
  faSun,
  faTag,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import { api } from "../../lib/api/client";
import { analyse, type InEntry, type InNote, type InTask, type Observation } from "../../lib/insights";
import Radar from "./Radar";
import { Tabs, TabsList, TabsTrigger } from "../ui/Tabs";

const ICONS: Record<Observation["icon"], IconDefinition> = {
  check: faCircleCheck,
  clock: faClock,
  fire: faFire,
  pen: faPenNib,
  sun: faSun,
  tag: faTag,
  smile: faFaceSmile,
  calendar: faCalendarDay,
};

/** Personality insights, worked out from the user's own journal, notes and tasks. Nothing leaves the browser. */
export default function InsightsCard({ handle }: { handle?: ReactNode }) {
  const sb = useMemo(api, []);
  const [data, setData] = useState<{ tasks: InTask[]; entries: InEntry[]; notes: InNote[] } | null>(null);
  const [err, setErr] = useState(false);
  const [page, setPage] = useState(0);
  // Home shows the type and the top three traits as bars; the radar chart is one press away, so the card stays short.
  const [chart, setChart] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const since = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10);
      const [t, j, n] = await Promise.all([
        sb.from("tasks").select("due_date,done,done_at,created_at,priority,list_id,cancelled,archived,recurrence").limit(5000),
        sb.from("journal_entries").select("entry_date,body,created_at").gte("entry_date", since).limit(2000),
        sb.from("notes").select("title,body,category,created_at,updated_at").is("deleted_at", null).limit(2000),
      ]);
      if (!live) return;
      if (t.error || j.error || n.error) return setErr(true);
      setData({ tasks: (t.data ?? []) as InTask[], entries: (j.data ?? []) as InEntry[], notes: (n.data ?? []) as InNote[] });
    })();
    return () => {
      live = false;
    };
  }, [sb]);

  const result = useMemo(() => (data ? analyse(data.tasks, data.entries, data.notes) : null), [data]);

  const head = (
    <div className="ap-card-h">
      <span>
        <FA icon={faWandMagicSparkles} /> Personality insights
      </span>
      <span className="flex items-center gap-1.5">
        {result?.enough && (
          <span className="ap-pager">
            <button className="ne-btn" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(0)}>
              <FA icon={faChevronLeft} />
            </button>
            <button className="ne-btn" aria-label="Next page" disabled={page === 1} onClick={() => setPage(1)}>
              <FA icon={faChevronRight} />
            </button>
          </span>
        )}
        {handle}
      </span>
    </div>
  );

  if (err)
    return (
      <section className="ap-card liquid-flat [backdrop-filter:var(--glass-blur)]">
        {head}
        <p className="ap-none">Couldn’t load your insights right now.</p>
      </section>
    );
  if (!result)
    return (
      <section className="ap-card liquid-flat [backdrop-filter:var(--glass-blur)]">
        {head}
        <p className="ap-none">Reading your workspace…</p>
      </section>
    );
  if (!result.enough)
    return (
      <section className="ap-card liquid-flat [backdrop-filter:var(--glass-blur)]">
        {head}
        <div className="ap-empty">
          <p>
            Insights appear once there’s something to look at. Write a few journal entries, jot some notes and add tasks — they’re worked
            out from what you actually do.
          </p>
          <div className="st-actions">
            <Link className="btn btn-secondary btn-sm" href="/dashboard/journal">
              Journal
            </Link>
            <Link className="btn btn-secondary btn-sm" href="/dashboard/notes?new=1">
              Notes
            </Link>
            <Link className="btn btn-secondary btn-sm" href="/dashboard/todo">
              To-do
            </Link>
          </div>
        </div>
      </section>
    );

  return (
    <section className="ap-card liquid-flat [backdrop-filter:var(--glass-blur)]" aria-label="Personality insights">
      {head}
      {page === 0 ? (
        <div className="ap-pers">
          <div className="ap-pers-top">
            <div>
              <b className="ap-type ap-type-name">{result.name}</b>
              <span>{result.summary}</span>
            </div>
          </div>
          <div className="ap-tags">
            {result.tags.map((t) => (
              <i key={t}>{t}</i>
            ))}
          </div>
          {chart ? (
            <Radar axes={result.axes} />
          ) : (
            <ul className="m-0 mt-1 grid w-full list-none gap-3 self-stretch p-0">
              {[...result.axes]
                .sort((a, b) => b.value - a.value)
                .slice(0, 3)
                .map((a) => (
                  <li key={a.key} title={a.why}>
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <b className="font-medium text-fg">{a.label}</b>
                      <span className="text-fg-subtle tabular-nums">{a.value}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-hover" aria-hidden>
                      <div className="h-full rounded-pill bg-accent" style={{ width: `${Math.max(4, Math.min(100, a.value))}%` }} />
                    </div>
                    <p className="m-0 mt-1 truncate text-[12px] text-fg-subtle">{a.why}</p>
                  </li>
                ))}
            </ul>
          )}
          <button type="button" aria-expanded={chart} onClick={() => setChart((v) => !v)} className="mt-1 cursor-pointer self-start text-[13px] text-fg-muted underline-offset-4 hover:text-fg hover:underline">
            {chart ? "Hide chart" : "Show all eight traits"}
          </button>
        </div>
      ) : (
        <div className="ap-pers ap-obs">
          {result.observations.length > 0 ? (
            <ul>
              {result.observations.map((o, i) => (
                <li key={i}>
                  <span>
                    <FA icon={ICONS[o.icon]} />
                  </span>
                  {o.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ap-none">Keep going — patterns show up after a few more days.</p>
          )}
          {result.words.length > 0 && (
            <div className="ap-words">
              <b>On your mind lately</b>
              <div>
                {result.words.map(([w, n]) => (
                  <i key={w} title={`${n} times`}>
                    {w}
                  </i>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <Tabs value={String(page)} onValueChange={(v) => setPage(Number(v))}>
        <TabsList className="ap-dots" aria-label="Insight pages">
          {[0, 1].map((p) => (
            <TabsTrigger key={p} value={String(p)} aria-label={p === 0 ? "Profile" : "Patterns"} />
          ))}
        </TabsList>
      </Tabs>
      <p className="ap-fine">Worked out on your device from your journal, notes and tasks. Patterns, not a diagnosis.</p>
    </section>
  );
}

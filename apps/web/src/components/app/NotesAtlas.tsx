"use client";
import { useMemo, useRef, useState } from "react";
import type { Note } from "../../lib/workspace";
import { displayTitle } from "../../lib/notes";

type Folder = { id: string; name: string };
type Edge = { a: number; b: number; why: "link" | "label" | "folder" };

const W = 1000;
const H = 640;
/** Cluster colours: one per folder (notes outside any folder use the first). Tokens, not literals. */
const TONES = ["var(--f-slate)", "var(--f-blue)", "var(--f-green)", "var(--f-amber)", "var(--f-violet)", "var(--f-pink)", "var(--f-red)"];

/** How the notes connect: a [[Title]] link in the text, a label in common, or the same folder. Strongest reason wins per pair. */
function connect(notes: Note[]): Edge[] {
  const edges = new Map<string, Edge>();
  const add = (a: number, b: number, why: Edge["why"]) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const have = edges.get(key);
    const rank = { link: 3, label: 2, folder: 1 } as const;
    if (!have || rank[why] > rank[have.why]) edges.set(key, { a, b, why });
  };
  const titles = notes.map((n) => n.title.trim().toLowerCase());
  notes.forEach((n, i) => {
    const body = n.body.toLowerCase();
    titles.forEach((t, j) => {
      if (i !== j && t && body.includes(`[[${t}]]`)) add(i, j, "link");
    });
    notes.forEach((m, j) => {
      if (j <= i) return;
      if ((n.labels ?? []).some((l) => (m.labels ?? []).includes(l))) add(i, j, "label");
      else if (n.folder_id && n.folder_id === m.folder_id) add(i, j, "folder");
    });
  });
  return [...edges.values()];
}

/** A small spring layout: connected notes pull together, every note pushes the others away. Deterministic, so it doesn't jump. */
function layout(count: number, edges: Edge[]) {
  const pos = Array.from({ length: count }, (_, i) => {
    const a = (i / Math.max(count, 1)) * Math.PI * 2;
    return { x: W / 2 + Math.cos(a) * 220, y: H / 2 + Math.sin(a) * 160 };
  });
  for (let step = 0; step < 220; step++) {
    const cool = 1 - step / 220;
    const force = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < count; i++)
      for (let j = i + 1; j < count; j++) {
        const dx = pos[i].x - pos[j].x;
        const dy = pos[i].y - pos[j].y;
        const d2 = Math.max(dx * dx + dy * dy, 25);
        const f = 9000 / d2;
        const d = Math.sqrt(d2);
        force[i].x += (dx / d) * f;
        force[i].y += (dy / d) * f;
        force[j].x -= (dx / d) * f;
        force[j].y -= (dy / d) * f;
      }
    for (const e of edges) {
      const dx = pos[e.b].x - pos[e.a].x;
      const dy = pos[e.b].y - pos[e.a].y;
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const f = (d - 110) * 0.02;
      force[e.a].x += (dx / d) * f;
      force[e.a].y += (dy / d) * f;
      force[e.b].x -= (dx / d) * f;
      force[e.b].y -= (dy / d) * f;
    }
    pos.forEach((p, i) => {
      // A gentle pull to the middle keeps lone notes from drifting off the map.
      force[i].x += (W / 2 - p.x) * 0.004;
      force[i].y += (H / 2 - p.y) * 0.004;
      p.x = Math.min(W - 40, Math.max(40, p.x + Math.max(-12, Math.min(12, force[i].x)) * cool));
      p.y = Math.min(H - 40, Math.max(40, p.y + Math.max(-12, Math.min(12, force[i].y)) * cool));
    });
  }
  return pos;
}

/** Atlas: your notes as a map. Each note is a dot; lines join notes that link, share a label or sit in the same folder. */
export default function NotesAtlas({ notes, folders, onOpen }: { notes: Note[]; folders: Folder[]; onOpen: (id: string) => void }) {
  const edges = useMemo(() => connect(notes), [notes]);
  const pos = useMemo(() => layout(notes.length, edges), [notes.length, edges]);
  const degree = useMemo(() => {
    const d = new Array<number>(notes.length).fill(0);
    edges.forEach((e) => {
      d[e.a]++;
      d[e.b]++;
    });
    return d;
  }, [notes.length, edges]);
  const [hover, setHover] = useState<number | null>(null);
  // Pan by dragging the background, zoom with the wheel or the buttons.
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const near = hover === null ? null : new Set([hover, ...edges.filter((e) => e.a === hover || e.b === hover).flatMap((e) => [e.a, e.b])]);
  const toneOf = (n: Note) => TONES[(folders.findIndex((f) => f.id === n.folder_id) + 1) % TONES.length];

  if (notes.length < 2)
    return (
      <section className="grid place-items-center gap-2 px-4 py-20 text-center" aria-label="Atlas">
        <b className="text-[20px] font-semibold">Your Atlas is empty</b>
        <p className="m-0 max-w-[420px] text-[14px] text-ink-3">Write a few notes. Atlas draws a map of how they connect: notes that share a label, sit in the same folder or link with [[Note title]].</p>
      </section>
    );

  return (
    <section aria-label="Atlas" className="mt-2">
      <p className="m-0 mb-3 text-[14px] text-ink-3">
        {notes.length} notes, {edges.length} {edges.length === 1 ? "connection" : "connections"}. Click a note to open it.
      </p>
      <div className="relative overflow-hidden rounded-r3 border bg-side">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-[min(70vh,640px)] w-full touch-none cursor-grab active:cursor-grabbing"
          role="img"
          aria-label="Map of your notes and how they connect"
          onWheel={(e) => setView((v) => ({ ...v, k: Math.min(3, Math.max(0.5, v.k * (e.deltaY < 0 ? 1.1 : 0.9))) }))}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const d = drag.current;
            setView((v) => ({ ...v, x: d.vx + (e.clientX - d.x) / v.k, y: d.vy + (e.clientY - d.y) / v.k }));
          }}
          onPointerUp={() => (drag.current = null)}
        >
          <g transform={`translate(${W / 2} ${H / 2}) scale(${view.k}) translate(${view.x - W / 2} ${view.y - H / 2})`}>
            {edges.map((e) => (
              <line
                key={`${e.a}-${e.b}`}
                x1={pos[e.a].x}
                y1={pos[e.a].y}
                x2={pos[e.b].x}
                y2={pos[e.b].y}
                stroke="var(--line-3)"
                strokeWidth={e.why === "link" ? 2 : 1}
                strokeDasharray={e.why === "folder" ? "3 4" : undefined}
                opacity={near && !(near.has(e.a) && near.has(e.b)) ? 0.12 : 0.7}
              />
            ))}
            {notes.map((n, i) => (
              <g
                key={n.id}
                transform={`translate(${pos[i].x} ${pos[i].y})`}
                opacity={near && !near.has(i) ? 0.25 : 1}
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                aria-label={`Open ${displayTitle(n)}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onOpen(n.id)}
                onKeyDown={(e) => e.key === "Enter" && onOpen(n.id)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <circle r={7 + Math.min(degree[i], 6) * 2} fill={toneOf(n)} stroke="var(--paper)" strokeWidth={2} />
                <text y={-(12 + Math.min(degree[i], 6) * 2)} textAnchor="middle" fontSize="13" fill="var(--ink-2)" style={{ paintOrder: "stroke", stroke: "var(--side)", strokeWidth: 4 }}>
                  {displayTitle(n).slice(0, 24)}
                </text>
              </g>
            ))}
          </g>
        </svg>
        <div className="absolute right-3 bottom-3 flex gap-1">
          <button type="button" className="ne-btn" aria-label="Zoom in" onClick={() => setView((v) => ({ ...v, k: Math.min(3, v.k * 1.25) }))}>
            +
          </button>
          <button type="button" className="ne-btn" aria-label="Zoom out" onClick={() => setView((v) => ({ ...v, k: Math.max(0.5, v.k / 1.25) }))}>
            −
          </button>
          <button type="button" className="ne-btn text-[12px]" aria-label="Reset view" onClick={() => setView({ x: 0, y: 0, k: 1 })}>
            Reset
          </button>
        </div>
      </div>
      <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-[13px] text-ink-3">
        <li>Solid thick line: links with [[Title]]</li>
        <li>Thin line: shared label</li>
        <li>Dashed line: same folder</li>
        <li>Colour: folder</li>
      </ul>
    </section>
  );
}

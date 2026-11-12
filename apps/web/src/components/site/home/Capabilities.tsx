"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { toneClass } from "../../../lib/tones";
import { CAPABILITIES, type Capability } from "../content";
import Phone from "../Phone";
import { Reveal } from "../Reveal";
import { Section, SectionHead, Surface } from "../ui";

const arrow =
  "grid size-11 place-items-center rounded-full bg-surface text-[14px] text-fg ring-1 ring-line-strong transition-[background-color,opacity] hover:bg-surface-muted disabled:opacity-30 disabled:hover:bg-surface";

/** The top of a card: the app screen rising from the bottom edge when there is one, otherwise the feature's icon, on the feature's tint. */
function Visual({ c }: { c: Capability }) {
  return (
    <div className={`${toneClass(c.tone)} tint relative h-[200px] overflow-hidden rounded-t-r3`} aria-hidden>
      {c.shot ? (
        <div className="absolute top-7 left-1/2 w-[132px] -translate-x-1/2">
          <Phone src={c.shot} alt="" className="w-full" />
        </div>
      ) : (
        <span className="absolute inset-0 grid place-items-center text-[46px] opacity-80">
          <FA icon={c.icon} />
        </span>
      )}
    </div>
  );
}

/**
 * Everything the workspace does, as a swipeable carousel: what it is in a sentence, and whether you can use it today. Built things say
 * Live; the rest say Building or Coming soon, so nothing here promises more than ships. Scroll, swipe, drag the bar or use the arrows.
 */
export default function Capabilities() {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false, index: 0 });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : 1;
    setEdge({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      index: Math.round(el.scrollLeft / step),
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // Drag the row with the mouse (touch already scrolls natively). While dragging, snapping and smooth scrolling are paused so the row
  // follows the pointer exactly; on release it eases to the nearest card.
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !track.current) return;
    drag.current = { x: e.clientX, left: track.current.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLUListElement>) => {
    const d = drag.current;
    const el = track.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 5) return;
    if (!d.moved) {
      d.moved = true;
      el.setPointerCapture(e.pointerId);
      el.style.scrollSnapType = "none";
      el.style.scrollBehavior = "auto";
      el.dataset.dragging = "true";
    }
    el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const d = drag.current;
    const el = track.current;
    drag.current = null;
    if (!el || !d?.moved) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : 1;
    delete el.dataset.dragging;
    el.style.scrollBehavior = "";
    el.scrollTo({ left: Math.round(el.scrollLeft / step) * step, behavior: "smooth" });
    window.setTimeout(() => (el.style.scrollSnapType = ""), 350);
  };

  const go = (dir: 1 | -1) => {
    const el = track.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
    el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: calm ? "auto" : "smooth" });
  };

  return (
    <Section id="workspace" band="soft">
      <SectionHead
        kicker="The workspace"
        title="All of it,"
        quiet="in one row."
        lead="What you can use today, and what is on the way. Swipe to see more."
      />
      <Reveal className="mt-[clamp(32px,5vw,56px)]">
        {/* The track bleeds to the screen edges; the padding lines the first card up with the page column. */}
        <ul
          ref={track}
          onScroll={measure}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          tabIndex={0}
          aria-label="Workspace features"
          className="mx-[calc(50%-50vw)] flex cursor-grab [&_img]:pointer-events-none [&_img]:select-none data-[dragging=true]:cursor-grabbing data-[dragging=true]:select-none snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-px-(--pad) px-(--pad) py-3 [--pad:max(var(--gutter),calc((100vw-var(--container))/2+var(--gutter)))] [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
        >
          {CAPABILITIES.map((c) => (
            <li key={c.t} className="w-[min(340px,82vw)] shrink-0 snap-start">
              <Surface lift className="flex h-full flex-col overflow-hidden">
                <Visual c={c} />
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <h3 className="m-0 font-serif font-semibold text-[26px] leading-tight tracking-[-0.022em]">{c.t}</h3>
                  <ul className="m-0 flex flex-1 list-none flex-col gap-2.5 p-0 text-[15px] text-fg-muted">
                    {c.pts.map((t) => (
                      <li key={t} className="flex items-start gap-2.5">
                        <FA icon={faCheck} className="mt-1.5 text-[12px]" /> {t}
                      </li>
                    ))}
                  </ul>
                  {c.status !== "live" && (
                    <span className="inline-flex h-12 items-center justify-center rounded-pill bg-surface-sunken px-6 text-[15px] font-medium text-fg-muted">
                      {c.status === "building" ? "In development" : "Coming soon"}
                    </span>
                  )}
                </div>
              </Surface>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5" aria-hidden>
            {CAPABILITIES.map((c, i) => (
              <i
                key={c.t}
                className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${i === edge.index ? "w-6 bg-green-fg" : "w-1.5 bg-green-fg/25"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className={arrow} onClick={() => go(-1)} disabled={edge.start} aria-label="Previous">
              <FA icon={faChevronLeft} />
            </button>
            <button type="button" className={arrow} onClick={() => go(1)} disabled={edge.end} aria-label="Next">
              <FA icon={faChevronRight} />
            </button>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

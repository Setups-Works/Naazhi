"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { CAPABILITIES } from "../content";
import { Reveal } from "../Reveal";
import { IconBadge, Section, SectionHead, StatusChip, Surface } from "../ui";

const arrow =
  "grid size-11 place-items-center rounded-full bg-surface text-[14px] text-fg ring-1 ring-line-strong transition-[background-color,opacity] hover:bg-surface-muted disabled:opacity-30 disabled:hover:bg-surface";

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

  const go = (dir: 1 | -1) => {
    const el = track.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduce";
    el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: calm ? "auto" : "smooth" });
  };

  return (
    <Section id="workspace" band="soft">
      <SectionHead kicker="The workspace" title="All of it," quiet="in one row." lead="What you can use today, and what is on the way. Swipe to see more." />
      <Reveal className="mt-[clamp(32px,5vw,56px)]">
        {/* The track bleeds to the screen edges; the padding lines the first card up with the page column. */}
        <ul
          ref={track}
          onScroll={measure}
          tabIndex={0}
          aria-label="Workspace features"
          className="mx-[calc(50%-50vw)] flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-px-(--pad) px-(--pad) py-3 [--pad:max(var(--gutter),calc((100vw-var(--container))/2+var(--gutter)))] [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
        >
          {CAPABILITIES.map((c) => (
            <li key={c.t} className="w-[min(320px,80vw)] shrink-0 snap-start">
              <Surface lift className="flex h-full min-h-[260px] flex-col gap-3 p-6">
                <div className="flex items-start justify-between">
                  <IconBadge icon={c.icon} />
                  <StatusChip status={c.status} />
                </div>
                <h3 className="mt-1 font-serif font-semibold text-[26px] leading-tight tracking-[-0.022em]">{c.t}</h3>
                <p className="text-[15px] leading-relaxed text-fg-muted">{c.d}</p>
              </Surface>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5" aria-hidden>
            {CAPABILITIES.map((c, i) => (
              <i key={c.t} className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${i === edge.index ? "w-6 bg-green-fg" : "w-1.5 bg-green-fg/25"}`} />
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

"use client";
import { useEffect, useRef, useState } from "react";
import { SHORTCUTS } from "../content";
import { Reveal } from "../Reveal";
import { Kbd, Kicker, Lead, Section, Surface } from "../ui";
import { Heading } from "../Heading";

const GROUPS = ["Anywhere", "Tasks", "Calendar"] as const;

/** Does this key press match a shortcut's key list? `⌘` means Cmd or Ctrl; `G T` is a two-step sequence. */
function matches(keys: string[], e: KeyboardEvent, lastKey: string) {
  const k = e.key.toLowerCase();
  if (keys[0] === "⌘") return (e.metaKey || e.ctrlKey) && k === keys[1]!.toLowerCase();
  if (e.metaKey || e.ctrlKey || e.altKey) return false;
  if (keys.length === 2) return lastKey === keys[0]!.toLowerCase() && k === keys[1]!.toLowerCase();
  return k === keys[0]!.toLowerCase();
}

/**
 * A shortcuts board you can play with: press the real keys while it is on screen and the matching row lights up. The keys are only
 * observed, never intercepted, so the browser's own shortcuts keep working.
 */
export default function Shortcuts() {
  const board = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [hit, setHit] = useState<number | null>(null);
  const [hint, setHint] = useState("Press ⌘K, Q, W or C to try them.");

  useEffect(() => {
    const el = board.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(Boolean(e?.isIntersecting)), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    let last = "";
    let reset: ReturnType<typeof setTimeout>;
    let fade: ReturnType<typeof setTimeout>;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input,textarea,select,[contenteditable=true]")) return;
      SHORTCUTS.forEach((s, i) => {
        if (!matches(s.keys, e, last)) return;
        setHit(i);
        setHint(`${s.keys.join(" ")} — ${s.label}`);
        clearTimeout(fade);
        fade = setTimeout(() => setHit(null), 900);
      });
      last = e.key.toLowerCase();
      clearTimeout(reset);
      reset = setTimeout(() => (last = ""), 900);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(reset);
      clearTimeout(fade);
    };
  }, [active]);

  return (
    <Section>
      <div className="grid items-center gap-[clamp(28px,5vw,72px)] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col items-start gap-5">
          <Reveal>
            <Kicker>Built for the keyboard</Kicker>
          </Reveal>
          <Heading quiet="never leave the keys.">Move fast and</Heading>
          <Reveal delay={150}>
            <Lead>Add a task, jump to today, search everything, switch the calendar view. All without reaching for the mouse. Shortcuts work whenever you aren’t typing in a field.</Lead>
          </Reveal>
          <Reveal delay={250}>
            <p aria-live="polite" className="inline-flex items-center gap-2.5 rounded-pill bg-surface px-4 py-2 text-[13.5px] text-fg-muted ring-1 ring-line">
              <i className={`size-2 rounded-full ${active ? "animate-pulse bg-green-fg" : "bg-fg-faint"}`} aria-hidden />
              {hint}
            </p>
          </Reveal>
        </div>

        <div ref={board}>
          <Reveal>
            <Surface radius="r5" className="p-[clamp(18px,3vw,32px)]">
              <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {GROUPS.map((g) => (
                  <div key={g} className={g === "Anywhere" ? "sm:col-span-2" : ""}>
                    <div className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-fg-faint uppercase">{g}</div>
                    <ul className={g === "Anywhere" ? "grid gap-x-8 sm:grid-cols-2" : ""}>
                      {SHORTCUTS.map((s, i) =>
                        s.group === g ? (
                          <li
                            key={s.label}
                            className={`flex items-center justify-between gap-4 rounded-r2 px-2 py-2.5 transition-[background-color,transform] duration-300 ${hit === i ? "scale-[1.03] bg-green-bg" : ""}`}
                          >
                            <span className="text-[14.5px] text-fg">{s.label}</span>
                            <span className="flex items-center gap-1.5">
                              {s.keys.map((k, n) => (
                                <span key={n} className="flex items-center gap-1.5">
                                  {n > 0 && g !== "Anywhere" && <small className="text-[12px] text-fg-faint">then</small>}
                                  <Kbd>{k}</Kbd>
                                </span>
                              ))}
                            </span>
                          </li>
                        ) : null,
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </Surface>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

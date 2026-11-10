"use client";
import { useState, type KeyboardEvent } from "react";
import Image from "next/image";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon as FA } from "@fortawesome/react-fontawesome";
import { faBookOpen, faCheck, faComments, faHouse, faListCheck, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { CHAT_POINTS, JOURNAL_POINTS, NOTE_POINTS, TASK_POINTS } from "../content";
import Glass from "../Glass";
import { Section, SectionHead } from "../Kit";
import Phone from "../Phone";
import { Reveal } from "../Reveal";

type Tab = { key: string; icon: IconDefinition; title: string; lead: string; src: string; alt: string; points: readonly string[] };

const TABS: readonly Tab[] = [
  {
    key: "home",
    icon: faHouse,
    title: "Home",
    lead: "Your day at a glance: your journal streak, what’s left to do today, your latest notes and your journal.",
    src: "/mobile/home.png",
    alt: "Home in the Naazhi app",
    points: ["Today’s tasks, ready to tick off", "Your journal streak for the week", "Recent notes one tap away"],
  },
  {
    key: "plan",
    icon: faListCheck,
    title: "Plan",
    lead: "Lists, priorities and repeats, laid out the way you work.",
    src: "/mobile/todo.png",
    alt: "The to-do list in the Naazhi app",
    points: TASK_POINTS.map(([, t, d]) => `${t}. ${d}`),
  },
  {
    key: "journal",
    icon: faBookOpen,
    title: "Journal",
    lead: "A private record of your days, as often as you like.",
    src: "/mobile/journal.png",
    alt: "The journal in the Naazhi app",
    points: JOURNAL_POINTS.map(([, t, d]) => `${t}. ${d}`),
  },
  {
    key: "notes",
    icon: faPenToSquare,
    title: "Notes",
    lead: "Colours, slash commands, voice and attachments, all kept in the note.",
    src: "/mobile/notes.png",
    alt: "Notes in the Naazhi app",
    points: NOTE_POINTS.slice(0, 4).map(([, t, d]) => `${t}. ${d}`),
  },
  {
    key: "chat",
    icon: faComments,
    title: "Chat",
    lead: "Ask anything, or tell it what to save. You approve before anything is stored.",
    src: "/mobile/chat.png",
    alt: "Chat in the Naazhi app",
    points: CHAT_POINTS.map(([, t, d]) => `${t}. ${d}`),
  },
];

/**
 * A tabbed tour of the real app: pick a screen on the left and the iPhone on the right changes to it, with what that screen does.
 * It sits on a smoked-glass panel. The tabs are a real tablist (arrow keys move between them).
 */
export default function Showcase() {
  const [active, setActive] = useState(0);
  const tab = TABS[active]!;
  const move = (e: KeyboardEvent, i: number) => {
    const to = e.key === "ArrowDown" || e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowUp" || e.key === "ArrowLeft" ? (i + TABS.length - 1) % TABS.length : null;
    if (to === null) return;
    e.preventDefault();
    setActive(to);
    document.getElementById(`tour-tab-${TABS[to]!.key}`)?.focus();
  };

  return (
    <Section id="tour">
      <Reveal>
        <Glass variant="dark" radius="r5" className="relative overflow-hidden px-[clamp(20px,4vw,64px)] py-[clamp(36px,6vw,80px)]">
          <span aria-hidden className="pointer-events-none absolute -top-24 -left-20 -z-10 size-[420px] rounded-full bg-green-fg/40 blur-[100px]" />
          <SectionHead dark eyebrow="A tour of the app" title="One app," quiet="five ways in." lead="Tap through the real screens. Nothing here is a mock-up." />
          <div className="mt-[clamp(32px,5vw,64px)] grid items-center gap-[clamp(28px,5vw,72px)] lg:grid-cols-[1.05fr_0.95fr]">
            <div role="tablist" aria-label="App screens" aria-orientation="vertical" className="flex flex-col gap-2">
              {TABS.map((t, i) => {
                const on = i === active;
                return (
                  <div key={t.key} className={`rounded-r4 transition-colors duration-300 ${on ? "bg-on-dark/10 ring-1 ring-on-dark/15" : "hover:bg-on-dark/5"}`}>
                    <button
                      type="button"
                      role="tab"
                      id={`tour-tab-${t.key}`}
                      aria-selected={on}
                      aria-controls="tour-panel"
                      tabIndex={on ? 0 : -1}
                      onClick={() => setActive(i)}
                      onKeyDown={(e) => move(e, i)}
                      className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
                    >
                      <span className={`grid size-10 shrink-0 place-items-center rounded-r2 text-[15px] transition-colors ${on ? "bg-on-dark text-fg" : "bg-on-dark/10 text-on-dark"}`}>
                        <FA icon={t.icon} />
                      </span>
                      <span className="flex-1">
                        <b className="block text-[17px] font-medium text-on-dark">{t.title}</b>
                        {!on && <small className="block truncate text-[13px] text-on-dark/60">{t.lead}</small>}
                      </span>
                    </button>
                    {on && (
                      <div id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${t.key}`} className="px-4 pb-5 pl-[70px]">
                        <p className="text-[15px] leading-relaxed text-on-dark/75">{t.lead}</p>
                        <ul className="mt-3 flex flex-col gap-2">
                          {t.points.map((p) => (
                            <li key={p} className="flex items-start gap-2.5 text-[14px] leading-snug text-on-dark/85">
                              <FA icon={faCheck} className="mt-0.5 text-[12px] text-on-dark" /> {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="relative mx-auto w-[min(300px,64vw)]">
              <span aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-on-dark/10 blur-[70px]" />
              <Phone alt={tab.alt} className="w-full">
                {TABS.map((t, i) => (
                  <Image
                    key={t.key}
                    src={t.src}
                    alt=""
                    fill
                    sizes="320px"
                    aria-hidden={i !== active}
                    className={`object-cover object-top transition-opacity duration-500 motion-reduce:transition-none ${i === active ? "opacity-100" : "opacity-0"}`}
                  />
                ))}
              </Phone>
            </div>
          </div>
        </Glass>
      </Reveal>
    </Section>
  );
}

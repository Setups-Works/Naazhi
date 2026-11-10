"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FontAwesomeIcon as FA } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import Glass from "../Glass";
import { Section } from "../Kit";
import Phone from "../Phone";
import { R, Reveal } from "../Reveal";
import { Title } from "../Title";
import { toneClass, type Tone } from "../../../lib/tones";
import PhoneHalf from "./PhoneHalf";

type Chapter = { key: string; tone: Tone; kicker: string; title: string; lead: string; points: readonly string[]; src: string; alt: string };

const CHAPTERS: readonly Chapter[] = [
  {
    key: "home",
    tone: "green",
    kicker: "Home",
    title: "Your day, at a glance.",
    lead: "Open the app and see what matters: your journal streak, what’s left to do today, your latest notes.",
    points: ["Today’s tasks, ready to tick off", "Your journal streak for the week", "Recent notes one tap away"],
    src: "/mobile/home.png",
    alt: "Home in the Naazhi app",
  },
  {
    key: "chat",
    tone: "mint",
    kicker: "Chat",
    title: "Ask. Review. Save.",
    lead: "The assistant can draft a note, a journal entry or a to-do. Nothing is saved until you say so.",
    points: ["Folders, pinned chats and unread markers", "You approve every save", "Share one chat with a read-only link"],
    src: "/mobile/chat.png",
    alt: "Chat in the Naazhi app",
  },
  {
    key: "plan",
    tone: "amber",
    kicker: "Plan",
    title: "Plan your day. Then do it.",
    lead: "Lists, priorities and repeats, in the view that suits the day.",
    points: ["Daily, weekly or the 2nd Wednesday", "List, board or calendar", "Priorities from urgent to low"],
    src: "/mobile/todo.png",
    alt: "The to-do list in the Naazhi app",
  },
  {
    key: "journal",
    tone: "violet",
    kicker: "Journal",
    title: "A journal that’s only yours.",
    lead: "Write as often as you like, by typing or by voice. It stays private to you.",
    points: ["Many entries a day", "Voice and attachments", "Browse by calendar"],
    src: "/mobile/journal.png",
    alt: "The journal in the Naazhi app",
  },
  {
    key: "notes",
    tone: "blue",
    kicker: "Notes",
    title: "Notes that keep up.",
    lead: "Colours, slash commands, voice and attachments, all kept in the note.",
    points: ["Version history", "Dictate instead of typing", "Export as Markdown"],
    src: "/mobile/notes.png",
    alt: "Notes in the Naazhi app",
  },
];

/**
 * The tour of the app, told as you scroll. On a wide screen the phone stays in place on the right while the chapters pass on the left;
 * the screen on the phone and the colour of the panel behind it change with the chapter in view. On a phone each chapter is its own
 * tile with the screen rising from its bottom edge.
 */
export default function Story() {
  const [active, setActive] = useState(0);
  const chapters = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const els = chapters.current.filter((e): e is HTMLElement => e !== null);
    if (typeof IntersectionObserver === "undefined") return;
    // A chapter is "current" when it crosses the middle of the screen.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <Section id="tour" tight>
      <div className="mx-auto flex max-w-[820px] flex-col items-center gap-4 text-center">
        <Title>
          Everything you keep, <br className="max-sm:hidden" />
          in one place.
        </Title>
        <Reveal delay={120}>
          <p className="text-[clamp(17px,1.7vw,21px)] leading-relaxed text-fg-muted">
            Write it, plan it, say it out loud or ask for it. It all lands in the same place, on the web and on your phone.
          </p>
        </Reveal>
      </div>

      {/* Wide screens: chapters on the left, one phone that stays put on the right. */}
      <div className="mt-[clamp(32px,5vw,64px)] hidden items-start gap-[clamp(32px,6vw,96px)] lg:grid lg:grid-cols-2">
        <div>
          {CHAPTERS.map((c, i) => (
            <article
              key={c.key}
              ref={(el) => {
                chapters.current[i] = el;
              }}
              data-index={i}
              className={`flex min-h-[88vh] flex-col justify-center gap-4 transition-[opacity,transform] duration-700 ease-site ${i === active ? "translate-x-0 opacity-100" : "translate-x-3 opacity-30"}`}
            >
              <p className="text-[13px] font-semibold tracking-[0.08em] text-green-fg uppercase">{c.kicker}</p>
              <h3 className="max-w-[460px] font-serif text-[clamp(34px,4vw,54px)] leading-[1.04] tracking-[-0.03em]">{c.title}</h3>
              <p className="max-w-[440px] text-[18px] leading-relaxed text-fg-muted">{c.lead}</p>
              <ul className="mt-2 flex flex-col gap-2.5">
                {c.points.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-[16px] text-fg">
                    <span className={`${toneClass(c.tone)} tint grid size-6 place-items-center rounded-full text-[11px]`}>
                      <FA icon={faCheck} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="sticky top-[88px] h-[calc(100vh-120px)] max-h-[780px]">
          <div
            className={`${toneClass(CHAPTERS[active]!.tone)} tint relative grid h-full place-items-center overflow-hidden rounded-r5 transition-[background-color,color] duration-700`}
          >
            <div className="relative h-[88%]">
              <Phone alt={CHAPTERS[active]!.alt} className="h-full">
                {CHAPTERS.map((c, i) => (
                  <Image
                    key={c.key}
                    src={c.src}
                    alt=""
                    fill
                    sizes="340px"
                    aria-hidden={i !== active}
                    className={`object-cover object-top transition-[opacity,transform] duration-700 ease-site motion-reduce:transition-none ${
                      i === active ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"
                    }`}
                  />
                ))}
              </Phone>
            </div>
          </div>
        </div>
      </div>

      {/* Phones and small windows: one tile per chapter. */}
      <Reveal stagger={0.1} className="mt-10 grid gap-4 sm:grid-cols-2 lg:hidden">
        {CHAPTERS.map((c) => (
          <R key={c.key}>
            <Glass variant="flat" radius="r5" tone={c.tone} className="relative flex h-full min-h-[520px] flex-col items-center overflow-hidden px-6 pt-9 text-center">
              <p className="text-[12.5px] font-semibold tracking-[0.08em] text-(--abf) uppercase">{c.kicker}</p>
              <h3 className="mt-2 max-w-[340px] font-serif text-[30px] leading-[1.08] tracking-[-0.025em]">{c.title}</h3>
              <p className="mt-3 max-w-[340px] text-[15.5px] leading-relaxed text-fg-muted">{c.lead}</p>
              <PhoneHalf src={c.src} alt={c.alt} className="bottom-0 left-1/2 w-[min(54%,240px)] -translate-x-1/2" />
            </Glass>
          </R>
        ))}
      </Reveal>
    </Section>
  );
}

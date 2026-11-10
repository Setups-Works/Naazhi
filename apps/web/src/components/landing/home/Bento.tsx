import Link from "next/link";
import { CAPABILITIES } from "../content";
import Glass from "../Glass";
import { Section, StatusChip } from "../Kit";
import { R, Reveal } from "../Reveal";
import { Title } from "../Title";
import type { Tone } from "../../../lib/tones";
import PhoneHalf from "./PhoneHalf";

const capability = (t: string) => CAPABILITIES.find((c) => c.t === t)!;

const TILES: { tone: Tone; label: string; title: string; lead: string; src: string; alt: string }[] = [
  {
    tone: "mint",
    label: "Chat",
    title: "Ask. Review. Save.",
    lead: "The assistant drafts notes, journal entries and to-dos. Nothing is saved until you say so.",
    src: "/mobile/chat.png",
    alt: "Chat in the Naazhi app",
  },
  {
    tone: "amber",
    label: "Plan",
    title: "Plan your day. Then do it.",
    lead: "Lists, priorities and repeats, in the view that suits the day.",
    src: "/mobile/todo.png",
    alt: "The to-do list in the Naazhi app",
  },
  {
    tone: "violet",
    label: "Journal",
    title: "A journal that’s only yours.",
    lead: "Write as often as you like, by typing or by voice. It stays private to you.",
    src: "/mobile/journal.png",
    alt: "The journal in the Naazhi app",
  },
  {
    tone: "blue",
    label: "Notes",
    title: "Notes that keep up.",
    lead: "Colours, slash commands, voice and attachments, all kept in the note.",
    src: "/mobile/notes.png",
    alt: "Notes in the Naazhi app",
  },
];

/**
 * The workspace in four big tiles, one idea each: a line, a sentence, and the real screen rising from the bottom of the tile.
 * Under them, the rest of the workspace in plain columns, with an honest status on anything not built yet.
 */
export default function Bento() {
  const more = [capability("Calendar"), capability("Universal search")];
  const coming = CAPABILITIES.filter((c) => c.status !== "live");
  return (
    <Section id="workspace">
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

      <Reveal stagger={0.1} className="mt-[clamp(36px,5vw,72px)] grid gap-4 md:grid-cols-2">
        {TILES.map((t) => (
          <R key={t.label}>
            <Glass variant="flat" radius="r5" tone={t.tone} className="relative flex h-full min-h-[560px] flex-col items-center overflow-hidden px-6 pt-10 text-center sm:px-10 sm:pt-12">
              <p className="text-[13px] font-semibold tracking-[0.06em] text-(--abf) uppercase">{t.label}</p>
              <h3 className="mt-2 max-w-[420px] font-serif text-[clamp(28px,3.2vw,40px)] leading-[1.08] tracking-[-0.025em]">{t.title}</h3>
              <p className="mt-3 max-w-[400px] text-[16px] leading-relaxed text-fg-muted">{t.lead}</p>
              <PhoneHalf src={t.src} alt={t.alt} className="bottom-0 left-1/2 w-[min(52%,250px)] -translate-x-1/2" />
            </Glass>
          </R>
        ))}
      </Reveal>

      <Reveal className="mt-[clamp(36px,5vw,64px)]">
        <div className="grid gap-x-10 gap-y-8 border-t border-line pt-8 md:grid-cols-3">
          {more.map((c) => (
            <div key={c.t} className="flex flex-col items-start gap-2">
              <h3 className="font-serif text-[24px] tracking-[-0.02em]">{c.t}</h3>
              <p className="text-[15px] leading-relaxed text-fg-muted">{c.d}</p>
            </div>
          ))}
          <div className="flex flex-col items-start gap-2">
            <h3 className="font-serif text-[24px] tracking-[-0.02em]">On the way</h3>
            <ul className="flex flex-col gap-2 text-[15px] text-fg-muted">
              {coming.map((c) => (
                <li key={c.t} className="flex items-center gap-2.5">
                  {c.t} <StatusChip status={c.status} />
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-8 text-center">
          <Link href="/how-it-works" className="text-[16px] text-green-fg underline-offset-4 hover:underline">
            See how it works ›
          </Link>
        </p>
      </Reveal>
    </Section>
  );
}

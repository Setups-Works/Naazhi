import type { Metadata } from "next";
import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faArrowRight,
  faBookOpen,
  faCalendarDays,
  faCheck,
  faComments,
  faKey,
  faListCheck,
  faMagnifyingGlass,
  faPenToSquare,
} from "@fortawesome/free-solid-svg-icons";
import { FAQS } from "../../components/site/content";
import { FaqList } from "../../components/site/Faq";
import { faqSlug } from "../../components/site/faqGroups";
import { Heading } from "../../components/site/Heading";
import JsonLd from "../../components/site/JsonLd";
import { CtaPanel, FeatureCards, PageHero, SectionHead } from "../../components/site/kit";
import Phone, { PhoneRow } from "../../components/site/Phone";
import { R, Reveal } from "../../components/site/Reveal";
import { buttonClass, Kicker, Lead, Section, Surface } from "../../components/site/ui";
import { RELEASES } from "../../features/changelog/releases";
import { faqSchema, howToSchema, pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "How it works",
  title: "How it works — Naazhi",
  description:
    "One workspace for notes, tasks, journal, calendar and chat, with email and meetings on the way. AI that you choose, or no AI at all.",
  path: "/how-it-works",
};
export const metadata: Metadata = pageMeta({ ...SEO, ownImage: true });

/** The four steps, each beside the app screen that shows it. The facts are the ones this page has always made. */
const STEPS = [
  {
    t: "Bring your work in",
    d: "Start with notes, tasks and a journal. Import what you already have, and take it all with you whenever you need to.",
    pts: ["Rich notes with slash commands and voice", "Import and export", "Everything stays yours"],
    shot: { src: "/mobile/notes-2.png", alt: "Notes in the Naazhi app" },
  },
  {
    t: "Connect your tools",
    d: "Connect Gmail and Google Calendar so the conversations and plans that matter live next to your notes, not in separate apps.",
    pts: ["Google connections are the first to arrive", "More integrations coming soon", "Multiple accounts with Pro"],
    shot: { src: "/mobile/connect.png", alt: "Asking a connected app from Naazhi chat" },
  },
  {
    t: "Work in one place",
    d: "Plan your week, tick off tasks, keep a journal and search it all together, with the context kept in one place instead of scattered.",
    pts: ["Tasks on the calendar", "One search across everything", "Email, meetings and automations on the way"],
    shot: { src: "/mobile/calendar.png", alt: "The calendar with tasks in the Naazhi app" },
  },
  {
    t: "Add AI only if you want it",
    d: "Use a supported AI account, bring your own API key, or top up only when you need it. Or keep the workspace fully AI-free. Switch any time.",
    pts: ["Bring your own API key", "Pay for usage when you need it", "AI-free mode, always available"],
    shot: { src: "/mobile/chat-2.png", alt: "Chat in the Naazhi app" },
  },
] as const;

const DAY = [
  { time: "8:00", icon: faCalendarDays, t: "See the day", d: "Open Home for today’s tasks, and the calendar for what is on." },
  {
    time: "11:30",
    icon: faListCheck,
    t: "Capture without breaking flow",
    d: "Press Q to add a task, or speak a note instead of typing it.",
  },
  { time: "15:00", icon: faMagnifyingGlass, t: "Find the thing", d: "Press ⌘K and search tasks, notes, journal and chats at once." },
  { time: "21:00", icon: faBookOpen, t: "Close the day", d: "Write a journal entry, privately, and let tomorrow’s tasks wait their turn." },
] as const;

const GET = [
  { icon: faPenToSquare, t: "Think and write", d: "Notes and a private journal, with voice and attachments." },
  { icon: faListCheck, t: "Plan and do", d: "Tasks with priorities and repeats, on a calendar you can read at a glance." },
  { icon: faComments, t: "Ask, with your OK", d: "An assistant that drafts things and waits for you to confirm." },
  { icon: faKey, t: "Choose your AI", d: "Bring your own key, pay as you go, or use none." },
] as const;

// The answers people look for here, from the FAQ's own copy (one copy of each answer); the rest are on /faq.
const QUESTIONS = [
  "Do I have to use AI?",
  "What happens if I switch AI provider or model?",
  "What can I use today, and what is still coming?",
  "How do I pay for AI?",
];
const FAQ = FAQS.filter(([q]) => QUESTIONS.includes(q));

export default function Page() {
  return (
    <main>
      <JsonLd
        data={[
          ...pageSchemas({ ...SEO, dateModified: RELEASES[0]?.date, about: "How Naazhi works" }),
          howToSchema({
            name: "Get started with Naazhi",
            description: SEO.description,
            path: SEO.path,
            steps: STEPS.map((s) => ({ name: s.t, text: s.d })),
          }),
          faqSchema(FAQ, {
            path: SEO.path,
            name: SEO.title,
            description: SEO.description,
            dateModified: RELEASES[0]?.date,
            anchor: faqSlug,
          }),
        ]}
      />
      <PageHero
        eyebrow="How it works"
        title="One workspace."
        quiet="Any AI, or none."
        lead="Naazhi brings your notes, tasks, journal, calendar and chat together, with email and meetings on the way, and keeps all of it separate from whichever AI you choose to use."
        visual={<PhoneRow screens={["/mobile/calendar.png", "/mobile/home-2.png", "/mobile/health.png"]} />}
      >
        <Link className={buttonClass("primary")} href="/demo">
          Try the product demo <FA icon={faArrowRight} />
        </Link>
        <Link className={buttonClass("secondary")} href="/pricing">
          See pricing
        </Link>
      </PageHero>

      <Section tight>
        <SectionHead kicker="In four steps" title="From scattered apps" quiet="to one calm place." />
      </Section>
      {STEPS.map((s, i) => (
        <Section key={s.t} id={`step-${i + 1}`} tight band={i % 2 === 0 ? "soft" : "plain"}>
          <div className="mx-auto grid max-w-5xl items-center gap-[clamp(28px,5vw,72px)] md:grid-cols-2">
            <Reveal stagger={0.08} className={`flex flex-col gap-4 ${i % 2 ? "md:order-2" : ""}`}>
              <R>
                <span className="grid size-11 place-items-center rounded-full bg-green-bg font-serif text-[20px] font-semibold text-green-fg">
                  {i + 1}
                </span>
              </R>
              <R>
                <h2 className="m-0 font-serif text-[clamp(30px,3.6vw,46px)] leading-[1.06] font-semibold tracking-[-0.03em] text-balance">
                  {s.t}
                </h2>
              </R>
              <R>
                <p className="m-0 text-[17px] leading-relaxed text-fg-muted">{s.d}</p>
              </R>
              <R>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {s.pts.map((p) => (
                    <li key={p} className="flex items-start gap-3 text-[15.5px] text-fg">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-green-bg text-[11px] text-green-fg">
                        <FA icon={faCheck} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </R>
            </Reveal>
            <Reveal className={i % 2 ? "md:order-1" : ""}>
              <div className="mx-auto w-[min(290px,72%)]">
                <Phone src={s.shot.src} alt={s.shot.alt} className="w-full" />
              </div>
            </Reveal>
          </div>
        </Section>
      ))}

      <Section tight>
        <SectionHead
          kicker="A day with it"
          title="What a day"
          quiet="looks like."
          lead="No grand routine required. Here is how the pieces fit into an ordinary day."
        />
        <Reveal stagger={0.08} className="mx-auto mt-[clamp(28px,4vw,48px)] grid max-w-3xl gap-3">
          {DAY.map((d) => (
            <R key={d.time}>
              <Surface radius="r3" className="flex items-center gap-5 px-5 py-4 sm:px-6">
                <span className="w-14 shrink-0 font-mono text-[14px] text-fg-subtle">{d.time}</span>
                <span className="grid size-11 shrink-0 place-items-center rounded-r2 bg-green-bg text-[16px] text-green-fg">
                  <FA icon={d.icon} />
                </span>
                <span className="min-w-0">
                  <b className="block text-[16px] font-semibold text-fg">{d.t}</b>
                  <span className="mt-0.5 block text-[14.5px] leading-snug text-fg-muted">{d.d}</span>
                </span>
              </Surface>
            </R>
          ))}
        </Reveal>
      </Section>

      <Section tight>
        <Reveal>
          <Surface variant="ink" radius="r5" className="overflow-hidden px-6 py-[clamp(40px,6vw,80px)] text-center">
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-5">
              <Kicker dark>The principle</Kicker>
              <Heading dark quiet="Your workspace shouldn’t.">
                Your AI can change.
              </Heading>
              <Lead dark className="mx-auto">
                Try a new model. Switch providers. Change what powers your AI. Your notes, tasks, journal and everything you’ve built stay
                exactly where they are.
              </Lead>
            </div>
          </Surface>
        </Reveal>
      </Section>

      <Section tight>
        <SectionHead kicker="What you get" title="Everything a day needs," quiet="in one flow." />
        <FeatureCards cols={4} items={GET} />
      </Section>

      <Section tight band="soft">
        <div className="mx-auto grid max-w-5xl items-start gap-[clamp(24px,5vw,64px)] lg:grid-cols-[0.7fr_1.3fr]">
          <Reveal className="flex flex-col gap-2 lg:sticky lg:top-28">
            <h2 className="m-0 font-serif text-[clamp(28px,3.4vw,40px)] leading-[1.08] font-semibold tracking-[-0.025em]">Questions</h2>
            <p className="m-0 text-[16px] leading-relaxed text-fg-muted">
              More answers are on the{" "}
              <Link href="/faq" className="text-green-fg underline underline-offset-4">
                FAQ page
              </Link>
              .
            </p>
          </Reveal>
          <div>
            <FaqList items={FAQ} anchor={faqSlug} />
          </div>
        </div>
      </Section>

      <CtaPanel
        title="See it"
        quiet="in action."
        lead="Click around a working preview of the workspace. No sign-up needed."
        primary={["Open the product demo", "/demo"]}
        secondary={["Read the FAQ", "/faq"]}
        phone="/mobile/chat-2.png"
      />
    </main>
  );
}

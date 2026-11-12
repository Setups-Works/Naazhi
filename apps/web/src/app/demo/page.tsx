import type { Metadata } from "next";
import Link from "next/link";
import {
  faBolt,
  faBookOpen,
  faCalendarDays,
  faDiagramProject,
  faEnvelope,
  faFeatherPointed,
  faKey,
  faListCheck,
  faLock,
  faMagnifyingGlass,
  faMicrophone,
  faMoon,
  faMugHot,
  faPenToSquare,
  faPlug,
  faSun,
  faToggleOn,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Icon as FA } from "@/components/ui/Icon";
import DemoApp from "../../components/demo/DemoApp";
import JsonLd from "../../components/site/JsonLd";
import { CAPABILITIES } from "../../components/site/content";
import { CompareTable, DayTimeline } from "../../components/site/blocks";
import { FaqList } from "../../components/site/Faq";
import { Heading } from "../../components/site/Heading";
import { CtaPanel, SectionHead } from "../../components/site/kit";
import Phone, { PhoneRow } from "../../components/site/Phone";
import { R, Reveal } from "../../components/site/Reveal";
import StoreBadges from "../../components/site/StoreBadges";
import { buttonClass, IconBadge, Kbd, Kicker, Lead, Section, StatusChip, Surface, TextLink } from "../../components/site/ui";
import { pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "Product demo",
  title: "Product demo — Naazhi",
  description: "Click around an interactive preview of the workspace: notes, to-do, journal, email, calendar, meetings and automations. No sign-up.",
  path: "/demo",
};
export const metadata: Metadata = pageMeta(SEO);

/** What is true of each area today comes from the site's own capability list, so this page can never promise more than ships. */
const status = (title: string) => CAPABILITIES.find((c) => c.t === title)?.status ?? "soon";

type Area = { icon: IconDefinition; t: string; cap: string; d: string; tryIt: string; tone: string };
const AREAS: Area[] = [
  { icon: faBookOpen, t: "Journal", cap: "Journal", d: "Many entries a day, private to you, with voice and attachments.", tryIt: "Pick a mood and add an entry.", tone: "violet" },
  { icon: faPenToSquare, t: "Notes", cap: "Notes", d: "Rich notes with colours, slash commands and tasks inside them.", tryIt: "Tick a task inside a note.", tone: "blue" },
  { icon: faListCheck, t: "To-do", cap: "Tasks", d: "Lists, priorities, repeats and list, board or calendar views.", tryIt: "Add a task and complete it.", tone: "amber" },
  { icon: faCalendarDays, t: "Calendar", cap: "Calendar", d: "Your days and events in one view.", tryIt: "Look across the week.", tone: "gold" },
  { icon: faEnvelope, t: "Email", cap: "Email", d: "Read, reply and forward beside your notes.", tryIt: "Open a thread and reply.", tone: "clay" },
  { icon: faMicrophone, t: "Meetings", cap: "Meetings", d: "Capture, transcribe and turn a meeting into follow-ups.", tryIt: "Start a recording.", tone: "sand" },
  { icon: faDiagramProject, t: "Automations", cap: "Automations", d: "Rules that handle the repetitive parts for you.", tryIt: "Flip a rule on and off.", tone: "violet" },
  { icon: faMagnifyingGlass, t: "Universal search", cap: "Universal search", d: "One box for everything you have written.", tryIt: "Press ⌘K and search.", tone: "mint" },
];

const DAY = [
  { time: "08:10", icon: faMugHot, t: "Start with the brief", d: "Open Home and see today’s tasks, events and what is overdue in one place." },
  { time: "11:30", icon: faFeatherPointed, t: "Capture without friction", d: "Jot a note, speak a journal entry or add a task before the thought is gone." },
  { time: "15:00", icon: faBolt, t: "Ask, then decide", d: "Ask the assistant to draft a to-do or a note. It shows a preview and saves nothing until you confirm." },
  { time: "21:30", icon: faMoon, t: "Close the day", d: "Write a few lines in your private journal and tick off what got done." },
] as const;

const AI = [
  { icon: faKey, t: "Bring your own key", d: "Add an OpenAI, Anthropic, Google or OpenRouter key and pick the model for each chat." },
  { icon: faWallet, t: "Pay as you go", d: "Top up credit in rupees and tokens come off it, or subscribe with autopay." },
  { icon: faPlug, t: "A supported AI account", d: "Sign in with the AI account you already pay for. This is being built." },
  { icon: faToggleOn, t: "Or no AI at all", d: "Switch it off and the workspace works the same. Try it in the preview." },
] as const;

const COMPARE: { label: string; values: string[] }[] = [
  { label: "Notes, to-do and journal", values: ["Click through", "Live today"] },
  { label: "Calendar", values: ["Click through", "Live today"] },
  { label: "Search (⌘K)", values: ["Sample data", "Live today"] },
  { label: "Chat with AI", values: ["Pick or switch off", "Live today"] },
  { label: "Health from your phone", values: ["Not in the preview", "Live today"] },
  { label: "Email", values: ["Sample inbox", "Coming soon"] },
  { label: "Meetings", values: ["Sample recording", "Coming soon"] },
  { label: "Automations", values: ["Sample rules", "Coming soon"] },
];

const DEMO_FAQS: [string, string][] = [
  ["Do I need an account to use the demo?", "No. It runs in your browser with sample data. There is nothing to sign up for and nothing is sent anywhere."],
  ["Is anything I type saved?", "No. Everything you add in the preview lives only on this page. Refresh and it resets."],
  ["Is the demo the real product?", "It is a faithful preview. Notes, to-do, journal and calendar are live in the product today. Email, meetings and automations are shown here as they are planned and are marked Coming soon."],
  ["Does it use AI?", "Only if you choose to. The preview lets you switch AI off, and the real workspace works the same without it."],
  ["Can I try it on my phone?", "Yes, this page works on a phone. For the full thing there is an Android app you can download today; the iPhone app is not out yet."],
];

export default function Page() {
  return (
    <main>
      <JsonLd data={pageSchemas(SEO)} />

      {/* Hero: words on the left, the real app on the right */}
      <section className="relative overflow-hidden pt-[clamp(40px,6vw,96px)] pb-[clamp(28px,4vw,64px)]">
        <div aria-hidden className="pointer-events-none absolute -top-24 right-[-10%] h-[460px] w-[min(900px,110vw)] rounded-full bg-green-bg/70 blur-3xl" />
        <div className="relative mx-auto grid w-full max-w-(--container) items-center gap-[clamp(28px,5vw,72px)] px-(--gutter) lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col items-start gap-5">
            <Reveal className="flex flex-wrap items-center gap-3">
              <Kicker>Product demo</Kicker>
              <span className="rounded-pill bg-hover px-2.5 py-1 text-[12px] font-medium text-fg-muted">No sign-up</span>
            </Reveal>
            <Heading as="h1" size="display" quiet="use it." immediate className="max-w-[640px]">
              Don’t read about it,
            </Heading>
            <Reveal delay={500}>
              <Lead>
                A working preview of Naazhi. Search with <Kbd>⌘K</Kbd>, write notes, reply to mail, plan your week and turn AI off, and it all responds. Nothing to install and nothing to
                sign up for.
              </Lead>
            </Reveal>
            <Reveal delay={700} className="flex flex-wrap items-center gap-3">
              <a className={buttonClass("primary")} href="#demo">
                Start clicking
              </a>
              <a className={buttonClass("secondary")} href="#areas">
                See what’s inside
              </a>
            </Reveal>
            <Reveal delay={850}>
              <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-[14px] text-fg-muted">
                {["Sample data", "Nothing is saved", "Works on a phone"].map((c) => (
                  <li key={c} className="inline-flex items-center gap-2">
                    <span aria-hidden className="size-1.5 rounded-pill bg-green-fg" /> {c}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal delay={400} className="hidden justify-center lg:flex">
            <Phone src="/mobile/home-2.png" alt="Naazhi Home on an iPhone" priority className="w-[min(300px,100%)]" />
          </Reveal>
        </div>
      </section>

      {/* The live preview */}
      <Section id="demo" tight>
        <SectionHead kicker="The preview" title="The whole workspace," quiet="in a window." lead="Everything below is clickable. Use the menu on the left, press ⌘K to search, and follow the guided tour on the right." />
        <Reveal className="mt-[clamp(24px,4vw,44px)]">
          <div className="mx-auto max-w-[1240px]">
            <DemoApp />
          </div>
        </Reveal>
        <p className="mx-auto mt-4 max-w-[760px] text-center text-[13.5px] text-fg-subtle">
          Preview with sample data. Email, meetings and automations are shown as they are planned; the live product connects to your own notes, tasks, journal and calendar today, with the
          rest arriving over time.
        </p>
      </Section>

      {/* Area by area */}
      <Section id="areas" tight>
        <SectionHead kicker="Area by area" title="What each part" quiet="does." lead="Every area in the preview, what it is for, and whether you can use it in the real product today." />
        <Reveal stagger={0.06} className="mt-[clamp(28px,4vw,52px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AREAS.map((a) => (
            <R key={a.t}>
              <Surface lift className="flex h-full flex-col gap-3 p-6">
                <div className="flex items-start justify-between gap-3">
                  <IconBadge icon={a.icon} />
                  <StatusChip status={status(a.cap)} />
                </div>
                <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-fg">{a.t}</h3>
                <p className="flex-1 text-[14.5px] leading-relaxed text-fg-muted">{a.d}</p>
                <p className="m-0 border-t border-line pt-3 text-[13.5px] text-fg-subtle">
                  <span className="font-medium text-fg-muted">Try: </span>
                  {a.tryIt}
                </p>
              </Surface>
            </R>
          ))}
        </Reveal>
      </Section>

      {/* A day */}
      <Section band="soft">
        <SectionHead kicker="A day with Naazhi" title="From the first look" quiet="to the last line." lead="Four moments where the workspace earns its place." />
        <DayTimeline moments={DAY} />
      </Section>

      {/* Phone */}
      <Section id="phone">
        <div className="grid items-center gap-[clamp(28px,5vw,72px)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col items-start gap-5">
            <Reveal>
              <Kicker>And on your phone</Kicker>
            </Reveal>
            <Heading quiet="in your pocket.">The same workspace,</Heading>
            <Reveal delay={150}>
              <Lead>
                The Android app has the same notes, tasks, journal and chat, plus Health from your phone. It looks like the website, in light, cream or charcoal, and signs in with Google or a
                passkey. The iPhone app is on its way.
              </Lead>
            </Reveal>
            <Reveal delay={250}>
              <StoreBadges />
            </Reveal>
            <Reveal delay={300}>
              <TextLink href="/download">All download options</TextLink>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <PhoneRow screens={["/mobile/notes-2.png", "/mobile/home-2.png", "/mobile/chat-2.png"]} />
          </Reveal>
        </div>
      </Section>

      {/* AI */}
      <Section band="ink" id="ai">
        <SectionHead dark kicker="AI on your terms" title="Pick the AI." quiet="Or none." lead="The preview lets you try each way of powering the assistant, including turning it off." />
        <Reveal stagger={0.08} className="mt-[clamp(28px,4vw,52px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AI.map((o) => (
            <R key={o.t}>
              <div className="flex h-full flex-col gap-3 rounded-r4 bg-on-dark/5 p-6 text-on-dark ring-1 ring-on-dark/15">
                <IconBadge icon={o.icon} dark />
                <h3 className="text-[17px] font-semibold">{o.t}</h3>
                <p className="text-[14.5px] leading-relaxed text-on-dark/70">{o.d}</p>
              </div>
            </R>
          ))}
        </Reveal>
        <Reveal delay={200} className="mt-6 flex items-center justify-center gap-3 text-[14.5px] text-on-dark/70">
          <FA icon={faLock} aria-hidden /> You approve every save. Nothing the assistant drafts is stored until you confirm.
        </Reveal>
      </Section>

      {/* Honest comparison */}
      <Section tight>
        <SectionHead kicker="Preview vs product" title="What’s real," quiet="and what’s planned." lead="The preview shows the whole picture. This is what you can use today." />
        <CompareTable plans={["In the demo", "In the product"]} rows={COMPARE} />
        <p className="mx-auto mt-4 max-w-[640px] text-center text-[13.5px] text-fg-subtle">
          See the full list, with progress on everything still being built, on the <Link href="/changelog" className="underline underline-offset-2">changelog</Link>.
        </p>
      </Section>

      {/* FAQ */}
      <Section id="faq" tight>
        <div className="grid items-start gap-[clamp(28px,5vw,72px)] lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col items-start gap-5 lg:sticky lg:top-28">
            <Reveal>
              <Kicker>About the demo</Kicker>
            </Reveal>
            <Heading quiet="answers.">Quick</Heading>
            <Reveal delay={150}>
              <Lead>What the preview is, what it stores, and how it differs from the real thing.</Lead>
            </Reveal>
            <Reveal delay={250}>
              <a className={buttonClass("secondary")} href="#demo">
                <FA icon={faSun} aria-hidden /> Back to the preview
              </a>
            </Reveal>
          </div>
          <FaqList items={DEMO_FAQS} />
        </div>
      </Section>

      <CtaPanel
        title="Like what"
        quiet="you see?"
        lead="Bring your own notes, tasks and calendar into the real thing. It is free to start, and AI is your choice."
        secondary={["How it works", "/how-it-works"]}
        phone="/mobile/home-2.png"
      />
    </main>
  );
}

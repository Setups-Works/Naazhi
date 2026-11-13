import type { Metadata } from "next";
import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faBan,
  faCheck,
  faCodeBranch,
  faCopyright,
  faEnvelope,
  faFlag,
  faLink,
  faMagnifyingGlass,
  faPenToSquare,
  faQuoteLeft,
  faScaleBalanced,
  faSignature,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { StepCards } from "../../components/site/blocks";
import { FaqList } from "../../components/site/Faq";
import { Heading } from "../../components/site/Heading";
import JsonLd from "../../components/site/JsonLd";
import { CtaPanel, FeatureCards, PageHero, SectionHead } from "../../components/site/kit";
import { R, Reveal } from "../../components/site/Reveal";
import { buttonClass, Kicker, Lead, Section, Surface } from "../../components/site/ui";
import { LEGAL_UPDATED, LEGAL_UPDATED_ISO, OPERATOR } from "../../lib/legal";
import { faqSchema, pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "Copyright & Licensing",
  title: "Copyright & Licensing — Naazhi",
  description: "Who owns what on the Naazhi site, how you may use it, which open-source work it builds on, and how to report a concern.",
  path: "/copyright-and-licensing",
};
export const metadata: Metadata = pageMeta(SEO);

const link = "text-green-fg underline underline-offset-2";

/** Every kind of material on the site and in the app, and whose it is. */
const OWNERSHIP = [
  { what: "Text on this site", owner: "Naazhi", note: "Pages, headings, descriptions, release notes and help text." },
  { what: "Designs, screens and pictures", owner: "Naazhi", note: "Layouts, illustrations, app screenshots and phone and tablet frames. Screens show sample data." },
  { what: "The Naazhi name, logo and wordmark", owner: "Naazhi", note: "They identify us. Please don’t use them as if they were yours or as if we endorse you." },
  { what: "The Naazhi app and its code", owner: "Naazhi", note: "Web and Android apps, and the services behind them." },
  { what: "What you write in Naazhi", owner: "You", note: "Notes, tasks, journal entries, chats and files you add. We use them only to run the service for you." },
  { what: "Other companies’ names and logos", owner: "Their owners", note: "Shown only to say which apps and services Naazhi works with." },
  { what: "Icons and fonts", owner: "Their authors", note: "Open-source work, used under the licences listed below." },
];

const NAMES = [
  "Google",
  "Gmail",
  "Google Calendar",
  "Google Drive",
  "Microsoft",
  "Outlook",
  "Zoho",
  "Slack",
  "Notion",
  "GitHub",
  "Apple",
  "Android",
  "Razorpay",
  "OpenAI",
  "Anthropic",
  "OpenRouter",
];

const OPEN_SOURCE = [
  {
    name: "Font Awesome Free",
    use: "Icons across the site",
    licence: "CC BY 4.0 (icons)",
    href: "https://fontawesome.com/license/free",
  },
  { name: "Lucide", use: "Icons inside the app", licence: "ISC", href: "https://lucide.dev/license" },
  { name: "Geist", use: "The main typeface", licence: "SIL Open Font License 1.1", href: "https://openfontlicense.org" },
  { name: "Instrument Serif", use: "Headings", licence: "SIL Open Font License 1.1", href: "https://openfontlicense.org" },
];

const OK = [
  "Link to any page on this site",
  "Quote a short passage, with the words in quotation marks, a clear credit to Naazhi and a link back",
  "Mention Naazhi by name to say that you use it or integrate with it",
  "Write a review, an article or a post about Naazhi in your own words",
];
const NOT_OK = [
  "Copy whole pages, or copy our text and pass it off as your own",
  "Reuse our screens, designs, pictures or phone frames without written permission",
  "Use the Naazhi name or logo in a product, company or domain name, or to suggest we endorse you",
  "Present our integrations or partners’ logos as if they were yours, or as an endorsement of anything",
];

const REPORT_STEPS = [
  {
    icon: faEnvelope,
    t: "Write to us",
    d: "Email the address below, ideally from an address we can reply to.",
    pts: ["One message per concern", "Plain language is fine"],
  },
  {
    icon: faMagnifyingGlass,
    t: "Tell us what and where",
    d: "Help us find it and see why it is yours.",
    pts: ["The page address (URL) and what is on it", "What it is and why it is yours", "How to reach you"],
  },
  {
    icon: faScaleBalanced,
    t: "We look at it",
    d: "We read every message and check it against what we have.",
    pts: ["We may ask you a question", "We keep your details private"],
  },
  {
    icon: faPenToSquare,
    t: "We fix it",
    d: "If something shouldn’t be here, we remove it or put it right, and tell you what we did.",
    pts: ["Credit added, or the item taken down", "A reply to you either way"],
  },
] as const;

const QA: readonly (readonly [string, string])[] = [
  [
    "Can I use a screenshot of Naazhi in an article or video?",
    "Please ask us first at the email address on this page. Our screens are copyrighted and show sample data. For a review or news piece we are usually glad to agree, and we may send you images made for that.",
  ],
  [
    "Can I copy text from this site?",
    "A short quote with credit and a link back is fine. Copying whole pages or reusing our text as your own is not, without written permission.",
  ],
  [
    "Who owns what I write in Naazhi?",
    "You do. Your notes, tasks, journal entries and chats are yours. We use them only to run Naazhi for you, as the Privacy Policy and Terms describe. We don’t claim ownership of them.",
  ],
  [
    "Why do you show other companies’ logos?",
    "To show which apps Naazhi can connect to, such as Gmail or Slack. The logos belong to those companies. Using them here doesn’t mean they sponsor, endorse or are partnered with Naazhi.",
  ],
  [
    "Does AI-written text in Naazhi belong to me?",
    "Text a model writes for you inside your workspace is part of your content. AI can be wrong, and it can resemble existing work, so check anything you plan to publish. Your AI provider’s own terms also apply when you use your own key.",
  ],
  [
    "Who do I contact about a copyright or trademark problem?",
    `Email ${OPERATOR.email} with the page address, what is on it and why it is yours. See “Something of yours appears here” above for what to include.`,
  ],
];

const TOC = [
  ["glance", "At a glance"],
  ["owners", "Who owns what"],
  ["using", "Using our material"],
  ["names", "Other names and logos"],
  ["open-source", "Open-source credits"],
  ["yours", "Your content"],
  ["report", "Report a concern"],
  ["faq", "Questions"],
] as const;

export default function Page() {
  return (
    <main>
      <JsonLd data={[...pageSchemas({ ...SEO, dateModified: LEGAL_UPDATED_ISO }), faqSchema(QA)]} />
      <PageHero
        eyebrow="Copyright & Licensing"
        title="Who owns what,"
        quiet="plainly."
        lead="What belongs to Naazhi, what belongs to you, whose names and work you see on this site, and how to ask us about any of it."
      >
        <a className={buttonClass("primary")} href="#owners">
          See who owns what
        </a>
        <a className={buttonClass("secondary")} href="#report">
          Report a concern
        </a>
      </PageHero>

      <div className="sticky top-[60px] z-20 border-y border-line bg-surface/80 backdrop-blur-xl">
        <nav aria-label="On this page" className="mx-auto flex w-full max-w-(--container) gap-1 overflow-x-auto px-(--gutter) py-2">
          {TOC.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="shrink-0 rounded-pill px-3.5 py-1.5 text-[13.5px] text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <Section id="glance" tight>
        <SectionHead kicker="At a glance" title="Three things" quiet="to know." />
        <FeatureCards
          items={[
            {
              icon: faCopyright,
              t: "Our work is ours",
              d: "The text, designs, screens, name, logo and app are owned by Naazhi. All rights are reserved.",
              tone: "green",
            },
            {
              icon: faUser,
              t: "Your content is yours",
              d: "What you write in Naazhi belongs to you. We use it only to run the service for you.",
              tone: "violet",
            },
            {
              icon: faSignature,
              t: "Other names are theirs",
              d: "Logos and names of other companies appear only to show compatibility, never partnership.",
              tone: "amber",
            },
          ]}
        />
      </Section>

      <Section id="owners" tight>
        <SectionHead
          kicker="Who owns what"
          title="Every kind of material,"
          quiet="in a table."
          lead="From a page heading to a note you wrote in the app: who it belongs to, and what to know about it."
        />
        <Reveal className="mt-[clamp(28px,4vw,52px)]">
          <Surface className="overflow-hidden">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Who owns what</caption>
              <thead>
                <tr className="bg-surface-muted/60 text-[11px] font-semibold tracking-[0.1em] text-fg-faint uppercase">
                  <th scope="col" className="px-5 py-4 sm:px-6">
                    Material
                  </th>
                  <th scope="col" className="px-5 py-4 sm:px-6">
                    Belongs to
                  </th>
                  <th scope="col" className="hidden px-5 py-4 sm:table-cell sm:px-6">
                    Good to know
                  </th>
                </tr>
              </thead>
              <tbody>
                {OWNERSHIP.map((r) => (
                  <tr key={r.what} className="border-t border-line align-top transition-colors hover:bg-green-bg/30">
                    <th scope="row" className="px-5 py-4 text-[15px] font-medium text-fg sm:px-6">
                      {r.what}
                      <span className="mt-1 block text-[13.5px] font-normal leading-relaxed text-fg-muted sm:hidden">{r.note}</span>
                    </th>
                    <td className="px-5 py-4 text-[15px] text-green-fg sm:px-6">{r.owner}</td>
                    <td className="hidden px-5 py-4 text-[14.5px] leading-relaxed text-fg-muted sm:table-cell sm:px-6">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Surface>
        </Reveal>
      </Section>

      <Section id="using" tight>
        <SectionHead
          kicker="Using our material"
          title="What’s fine,"
          quiet="and what needs a yes."
          lead="We want people to be able to talk about Naazhi. For anything beyond the list on the left, please ask first."
        />
        <Reveal stagger={0.1} className="mt-[clamp(28px,4vw,52px)] grid gap-4 md:grid-cols-2">
          <R>
            <Surface variant="soft" className="flex h-full flex-col gap-4 p-6 sm:p-8">
              <h3 className="flex items-center gap-2.5 font-serif text-[26px] font-semibold tracking-[-0.02em]">
                <span className="grid size-8 place-items-center rounded-full bg-green-bg text-green-fg">
                  <FA icon={faCheck} className="text-[14px]" />
                </span>
                You may
              </h3>
              <ul className="flex flex-col gap-3">
                {OK.map((x) => (
                  <li key={x} className="flex gap-3 text-[15px] leading-relaxed text-fg">
                    <FA icon={faCheck} className="mt-1.5 shrink-0 text-[12px] text-green-fg" />
                    {x}
                  </li>
                ))}
              </ul>
            </Surface>
          </R>
          <R>
            <Surface className="flex h-full flex-col gap-4 p-6 sm:p-8">
              <h3 className="flex items-center gap-2.5 font-serif text-[26px] font-semibold tracking-[-0.02em]">
                <span className="grid size-8 place-items-center rounded-full bg-clay-bg text-clay-fg">
                  <FA icon={faBan} className="text-[14px]" />
                </span>
                Please don’t, without asking
              </h3>
              <ul className="flex flex-col gap-3">
                {NOT_OK.map((x) => (
                  <li key={x} className="flex gap-3 text-[15px] leading-relaxed text-fg">
                    <FA icon={faBan} className="mt-1.5 shrink-0 text-[12px] text-clay-fg" />
                    {x}
                  </li>
                ))}
              </ul>
            </Surface>
          </R>
        </Reveal>
        <Reveal delay={150} className="mt-4">
          <Surface className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:gap-5 sm:p-7">
            <span className="grid size-11 shrink-0 place-items-center rounded-r3 bg-blue-bg text-blue-fg">
              <FA icon={faQuoteLeft} className="text-[16px]" />
            </span>
            <p className="text-[15px] leading-relaxed text-fg-muted">
              <span className="font-medium text-fg">How to credit us.</span> Write “Source: Naazhi” next to the quote and link to the page it came from. If
              you need more than a short passage, or want to use a screen, email{" "}
              <a className={link} href={`mailto:${OPERATOR.email}`}>
                {OPERATOR.email}
              </a>{" "}
              and tell us what for.
            </p>
          </Surface>
        </Reveal>
      </Section>

      <Section id="names" tight>
        <SectionHead
          kicker="Other names and logos"
          title="Theirs, shown"
          quiet="to be clear."
          lead="Naazhi connects to apps you already use. Their names and logos help you recognise them."
        />
        <Reveal className="mt-[clamp(28px,4vw,48px)]">
          <Surface className="flex flex-col gap-6 p-6 sm:p-8">
            <ul className="flex flex-wrap gap-2" aria-label="Names that belong to other companies">
              {NAMES.map((n) => (
                <li key={n} className="rounded-pill bg-surface-sunken px-3.5 py-1.5 text-[14px] text-fg-muted ring-1 ring-line">
                  {n}
                </li>
              ))}
            </ul>
            <ul className="grid gap-3 text-[15px] leading-relaxed text-fg-muted sm:grid-cols-2">
              <li className="flex gap-3">
                <FA icon={faCheck} className="mt-1.5 shrink-0 text-[12px] text-green-fg" />
                Each name and logo is a trademark or copyright of its owner.
              </li>
              <li className="flex gap-3">
                <FA icon={faCheck} className="mt-1.5 shrink-0 text-[12px] text-green-fg" />
                They appear only to say which apps and services Naazhi works with.
              </li>
              <li className="flex gap-3">
                <FA icon={faCheck} className="mt-1.5 shrink-0 text-[12px] text-green-fg" />
                Naazhi is not affiliated with, sponsored by or endorsed by these companies.
              </li>
              <li className="flex gap-3">
                <FA icon={faCheck} className="mt-1.5 shrink-0 text-[12px] text-green-fg" />
                Android is a trademark of Google LLC, and Google Play and the Google Play logo are trademarks of Google LLC. App Store, iPhone and iPad are trademarks of Apple Inc.
              </li>
            </ul>
            <p className="text-[14px] leading-relaxed text-fg-subtle">
              If you own one of these marks and want it shown differently, or removed, tell us and we will act on it.
            </p>
          </Surface>
        </Reveal>
      </Section>

      <Section id="open-source" tight>
        <SectionHead
          kicker="Open-source credits"
          title="Built on the work"
          quiet="of others."
          lead="Some icons and fonts here are free for everyone to use. They stay under their own licences, and we credit them as those licences ask."
        />
        <Reveal className="mt-[clamp(28px,4vw,52px)]">
          <Surface className="overflow-hidden">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Open-source icons and fonts used by Naazhi</caption>
              <thead>
                <tr className="bg-surface-muted/60 text-[11px] font-semibold tracking-[0.1em] text-fg-faint uppercase">
                  <th scope="col" className="px-5 py-4 sm:px-6">
                    Work
                  </th>
                  <th scope="col" className="hidden px-5 py-4 sm:table-cell sm:px-6">
                    Used for
                  </th>
                  <th scope="col" className="px-5 py-4 sm:px-6">
                    Licence
                  </th>
                </tr>
              </thead>
              <tbody>
                {OPEN_SOURCE.map((o) => (
                  <tr key={o.name} className="border-t border-line align-top transition-colors hover:bg-green-bg/30">
                    <th scope="row" className="px-5 py-4 text-[15px] font-medium text-fg sm:px-6">
                      {o.name}
                      <span className="mt-1 block text-[13.5px] font-normal text-fg-muted sm:hidden">{o.use}</span>
                    </th>
                    <td className="hidden px-5 py-4 text-[14.5px] text-fg-muted sm:table-cell sm:px-6">{o.use}</td>
                    <td className="px-5 py-4 text-[14.5px] sm:px-6">
                      <a className={link} href={o.href} target="_blank" rel="noopener noreferrer">
                        {o.licence}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Surface>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-4 flex items-start gap-3 text-[14px] leading-relaxed text-fg-subtle">
            <FA icon={faCodeBranch} className="mt-1 shrink-0 text-[13px]" />
            Other open-source software that Naazhi runs on keeps its own licences. A licence for a font, icon or library never gives anyone rights to the Naazhi
            name, logo or designs.
          </p>
        </Reveal>
      </Section>

      <Section id="yours" tight>
        <Reveal>
          <Surface variant="ink" radius="r5" className="overflow-hidden p-[clamp(24px,5vw,64px)]">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div className="flex flex-col items-start gap-5">
                <Kicker dark>Your content</Kicker>
                <Heading dark quiet="stays yours.">
                  What you write
                </Heading>
                <Lead dark>
                  Your notes, tasks, journal and chats belong to you. We don’t claim ownership, and we don’t reuse them to promote Naazhi.
                </Lead>
              </div>
              <ul className="grid gap-3">
                {[
                  "You keep every right in what you write and upload",
                  "We use it only to run the service for you",
                  "You can export it or delete it whenever you like",
                  "Your AI provider’s terms apply if you use your own key",
                ].map((x) => (
                  <li key={x} className="flex items-center gap-3.5 rounded-r3 bg-on-dark/5 px-4 py-3.5 text-[15px] ring-1 ring-on-dark/15">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-on-dark/15">
                      <FA icon={faCheck} className="text-[12px]" />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-8 text-[14px] text-on-dark/70">
              The full detail is in the{" "}
              <Link className="underline underline-offset-2 hover:text-on-dark" href="/privacy">
                Privacy Policy
              </Link>{" "}
              and the{" "}
              <Link className="underline underline-offset-2 hover:text-on-dark" href="/terms">
                Terms
              </Link>
              .
            </p>
          </Surface>
        </Reveal>
      </Section>

      <Section id="report" tight>
        <SectionHead
          kicker="Report a concern"
          title="Something of yours"
          quiet="appears here?"
          lead="If you think something on this site uses your work, name or mark without permission, tell us. It takes four short steps."
        />
        <StepCards steps={REPORT_STEPS} />
        <Reveal delay={100} className="mt-4">
          <Surface variant="soft" className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-r3 bg-green-bg text-green-fg">
                <FA icon={faFlag} className="text-[16px]" />
              </span>
              <div>
                <p className="text-[16px] font-medium text-fg">Email the team behind Naazhi</p>
                <p className="mt-1 text-[14.5px] leading-relaxed text-fg-muted">
                  {OPERATOR.name} · {OPERATOR.address}
                </p>
              </div>
            </div>
            <a className={buttonClass("primary")} href={`mailto:${OPERATOR.email}?subject=Copyright%20or%20trademark%20concern`}>
              {OPERATOR.email}
            </a>
          </Surface>
        </Reveal>
      </Section>

      <Section id="faq" tight>
        <SectionHead kicker="Questions" title="Common" quiet="questions." />
        <div className="mx-auto mt-[clamp(28px,4vw,48px)] max-w-[820px]">
          <FaqList items={QA} />
        </div>
        <Reveal>
          <p className="mx-auto mt-8 flex max-w-[820px] flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-subtle">
            <FA icon={faLink} className="text-[12px]" />
            Last updated {LEGAL_UPDATED}. This page explains how we handle copyright and trademarks. It is not legal advice, and it works alongside the{" "}
            <a className={link} href="/terms">
              Terms
            </a>
            .
          </p>
        </Reveal>
      </Section>

      <CtaPanel
        title="Still not sure"
        quiet="who owns it?"
        lead="Ask us. We would rather answer a quick question than have you guess."
        primary={["Contact us", "/contact"]}
        secondary={["Read the Terms", "/terms"]}
      />
    </main>
  );
}

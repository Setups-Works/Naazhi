import type { Metadata } from "next";
import {
  faArrowDown,
  faBell,
  faBookOpen,
  faCheck,
  faCloudArrowDown,
  faDesktop,
  faMicrophone,
  faMobileScreen,
  faPenToSquare,
  faPlug,
  faTableColumns,
  faRightToBracket,
  faTabletScreenButton,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Icon as FA } from "@/components/ui/Icon";
import { AppPreview, type PreviewKind } from "@/components/ui/AppPreview";
import { StepCards } from "../../components/site/blocks";
import { FaqList } from "../../components/site/Faq";
import { Heading } from "../../components/site/Heading";
import { CtaPanel, FeatureCards, PageHero, SectionHead } from "../../components/site/kit";
import Phone, { PhoneRow } from "../../components/site/Phone";
import { R, Reveal } from "../../components/site/Reveal";
import { ButtonLink, buttonClass, IconBadge, Kicker, Lead, Section, StatusChip, Surface, type Status } from "../../components/site/ui";
import AuthLink from "../../components/auth/AuthLink";
import JsonLd from "../../components/site/JsonLd";
import { RELEASES } from "../../features/changelog/releases";
import { breadcrumbSchema, faqSchema, pageMeta, softwareSchema, webPageSchema } from "../../lib/seo";
import { GITHUB_REPO } from "../../lib/site";

const TITLE = "Download — Naazhi";
const DESCRIPTION =
  "Get Naazhi on your phone. The Android app is available to download now, the web app works everywhere, and the iPhone app, Mac and Windows apps and a browser extension are coming soon.";
export const metadata: Metadata = pageMeta({ title: TITLE, description: DESCRIPTION, path: "/download" });

const RELEASE = `${GITHUB_REPO}/releases/latest`;

// The newest app version in the changelog (the list is newest first), so this page never names an older release.
const latest = RELEASES.find((r) => r.appVersion);
const VERSION = latest?.appVersion;
const RELEASED = latest
  ? new Date(`${latest.date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
  : undefined;

// Status must match what ships: the Android app is a downloadable APK today; there is no iPhone, desktop or extension build yet.
const platforms: {
  icon: IconDefinition;
  name: string;
  status: Status;
  title: string;
  items: string[];
  preview: PreviewKind;
  action: "apk" | "web" | "none";
}[] = [
  {
    icon: faMobileScreen,
    name: "Android",
    status: "live",
    title: "Naazhi, one tap away.",
    items: [
      "Quick notes, tasks and journal entries on the go",
      "Voice notes you can record in one tap",
      "Your workspace, in sync with the web",
    ],
    preview: "phone",
    action: "apk",
  },
  {
    icon: faTabletScreenButton,
    name: "iPhone and iPad",
    status: "soon",
    title: "On the App Store, soon.",
    items: [
      "The same workspace on your iPhone and iPad",
      "Notes, tasks and journal in a couple of taps",
      "In sync with the web and Android",
    ],
    preview: "phone",
    action: "none",
  },
  {
    icon: faDesktop,
    name: "Web",
    status: "live",
    title: "Nothing to install.",
    items: ["Open Naazhi in any modern browser", "Works at phone width and on a big screen", "The same account everywhere"],
    preview: "desktop",
    action: "web",
  },
  {
    icon: faDesktop,
    name: "Mac",
    status: "soon",
    title: "Naazhi on your Mac.",
    items: ["The whole workspace in its own window", "Quick capture from anywhere on your computer", "In sync with the web and your phone"],
    preview: "desktop",
    action: "none",
  },
  {
    icon: faTableColumns,
    name: "Windows",
    status: "soon",
    title: "Naazhi on your PC.",
    items: ["The whole workspace in its own window", "Quick capture from anywhere on your computer", "In sync with the web and your phone"],
    preview: "desktop",
    action: "none",
  },
  {
    icon: faPlug,
    name: "Browser extension",
    status: "soon",
    title: "Every meeting, written down.",
    items: [
      "Record a meeting in your browser and get a transcript",
      "It lands in a Naazhi note, where you can read and edit it",
      "Share it and turn action items into tasks",
    ],
    preview: "browser",
    action: "none",
  },
];

const install = [
  {
    icon: faCloudArrowDown,
    t: "Download the app",
    d: "Open the latest release on GitHub and download the Android file (the one ending in .apk).",
    pts: ["Always the newest version", "Every release is listed in the changelog"],
  },
  {
    icon: faMobileScreen,
    t: "Open the file",
    d: "Tap the download. Android may ask you to allow installs from your browser or Files app, because the app isn’t in the Play Store yet.",
    pts: ["You can switch that permission off again afterwards", "Only install apps you trust"],
  },
  {
    icon: faRightToBracket,
    t: "Sign in and go",
    d: "Open Naazhi and sign in with your passkey, Google or username. Your notes, tasks and journal are already there.",
    pts: ["Same account as the web app", "Synced between your devices"],
  },
] as const;

const inApp = [
  { icon: faPenToSquare, t: "Notes and tasks", d: "Capture a thought or tick something off in a couple of taps." },
  { icon: faMicrophone, t: "Dictate anything", d: "Speak a note or a journal entry and watch it become text." },
  { icon: faBookOpen, t: "A private journal", d: "Write as often as you like. It stays private to you." },
  { icon: faBell, t: "Reminders", d: "Notifications for what’s due, so nothing slips by." },
];

const faqs: [string, string][] = [
  [
    "How do I update the app?",
    "Download the newest file from the releases page and open it over the version you have. Your data stays in your account. Each version is listed in the changelog.",
  ],
  [
    "Is the app free?",
    "Yes. The workspace itself is free to use. You only pay if you choose a plan for AI. See the pricing page for the details.",
  ],
  [
    "Why isn’t it in the Play Store?",
    "Not yet. For now the Android app is a direct download from our GitHub releases. We’ll add the store listing here when it exists.",
  ],
  [
    "Is the APK safe to install?",
    "It’s built from this project’s own repository and published on its releases page. As with any app outside a store, only download it from that page.",
  ],
  [
    "When is the iPhone app coming?",
    "It’s in the plans and marked “Coming soon” here. We won’t say it’s available until you can actually install it.",
  ],
  [
    "What about Mac, Windows and a browser extension?",
    "They’re planned and marked “Coming soon” here. Until they exist, the web app works in any browser on a Mac or a Windows PC.",
  ],
  [
    "Do I need the app to use Naazhi on my phone?",
    "No. The web app is built mobile-first and works at phone width. The Android app adds a home-screen app, notifications and a faster start.",
  ],
];

export default function Page() {
  return (
    <main>
      <JsonLd
        data={[
          webPageSchema({ name: TITLE, description: DESCRIPTION, path: "/download" }),
          softwareSchema({ version: VERSION, released: latest?.date }),
          breadcrumbSchema([{ name: "Download", path: "/download" }]),
          faqSchema(faqs),
        ]}
      />
      <PageHero
        eyebrow="Download"
        status={
          VERSION && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-green-bg px-3 py-1 font-mono text-[12.5px] text-green-fg">
              <i className="size-1.5 rounded-full bg-current" aria-hidden />
              Latest {VERSION}
            </span>
          )
        }
        title="Take your workspace"
        quiet="with you."
        lead="Notes, tasks, journal and chat in your pocket. Get the Android app today, and use the web app anywhere else."
        visual={<PhoneRow screens={["/mobile/notes-2.png", "/mobile/home-2.png", "/mobile/chat-2.png"]} />}
      >
        <ButtonLink href={RELEASE} external arrow>
          Download for Android
        </ButtonLink>
        <AuthLink className={buttonClass("secondary")} signedIn="Open the web app" href="/signup">
          Use it on the web
        </AuthLink>
      </PageHero>

      <Section tight>
        <SectionHead kicker="Choose your device" title="Wherever you" quiet="keep your day." />
        <Reveal stagger={0.1} className="mt-[clamp(28px,4vw,52px)] grid gap-4 md:grid-cols-3">
          {platforms.map((p) => (
            <R key={p.name}>
              <Surface lift className="flex h-full flex-col overflow-hidden">
                <AppPreview kind={p.preview} />
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className="m-0 flex items-center gap-2 text-[14px] text-fg-muted">
                      <FA icon={p.icon} /> {p.name}
                    </p>
                    <StatusChip status={p.status} />
                  </div>
                  <h3 className="m-0 font-serif font-semibold text-[26px] leading-tight tracking-[-0.022em]">{p.title}</h3>
                  <ul className="m-0 flex flex-1 list-none flex-col gap-2.5 p-0 text-[15px] text-fg-muted">
                    {p.items.map((t) => (
                      <li key={t} className="flex items-start gap-2.5">
                        <FA icon={faCheck} className="mt-1.5 text-[12px]" /> {t}
                      </li>
                    ))}
                  </ul>
                  {p.action === "apk" && (
                    <>
                      {VERSION && (
                        <p className="m-0 font-mono text-[13px] text-fg-muted">
                          Version {VERSION}
                          {RELEASED && <span className="text-fg-faint"> · {RELEASED}</span>}
                        </p>
                      )}
                      <ButtonLink href={RELEASE} external arrow>
                        Download APK
                      </ButtonLink>
                    </>
                  )}
                  {p.action === "web" && (
                    <AuthLink className={buttonClass("secondary")} signedIn="Open the web app" href="/signup" arrow>
                      Open Naazhi
                    </AuthLink>
                  )}
                  {p.action === "none" && (
                    <span className="inline-flex h-12 items-center justify-center rounded-pill bg-surface-sunken px-6 text-[15px] font-medium text-fg-muted">
                      Coming soon
                    </span>
                  )}
                </div>
              </Surface>
            </R>
          ))}
        </Reveal>
      </Section>

      <Section id="install" band="soft">
        <SectionHead
          kicker="Android"
          title="Install it in"
          quiet="three steps."
          lead="It takes about a minute. No account with a store needed."
        />
        <StepCards steps={install} />
        <Reveal className="mt-8 text-center">
          <a href={RELEASE} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
            <span className="inline-flex items-center gap-2">
              Get {VERSION ? `version ${VERSION}` : "the latest release"} <span aria-hidden>↓</span>
            </span>
          </a>
        </Reveal>
      </Section>

      <Section>
        <div className="grid items-center gap-[clamp(32px,6vw,96px)] lg:grid-cols-2">
          <div className="flex flex-col items-start gap-5">
            <Reveal>
              <Kicker>In the app</Kicker>
            </Reveal>
            <Heading quiet="in your hand.">The whole workspace,</Heading>
            <Reveal delay={120}>
              <Lead>Everything you use on the web, laid out for a thumb. The same account, the same data, always in sync.</Lead>
            </Reveal>
            <Reveal delay={200} className="w-full">
              <ul className="grid gap-3 sm:grid-cols-2">
                {inApp.map((x) => (
                  <li key={x.t} className="flex items-start gap-3 rounded-r3 bg-surface p-4 ring-1 ring-line">
                    <IconBadge icon={x.icon} className="size-10 text-[15px]" />
                    <span>
                      <b className="block text-[15px] font-semibold text-fg">{x.t}</b>
                      <small className="mt-0.5 block text-[13.5px] leading-snug text-fg-muted">{x.d}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal>
            <div className="relative grid place-items-center overflow-hidden rounded-r5 bg-green-bg px-6 pt-10 ring-1 ring-green-fg/10 [mask-image:linear-gradient(to_bottom,black_80%,transparent)]">
              <div className="flex w-full max-w-[460px] items-end justify-center gap-[4%]">
                <Phone src="/mobile/calendar.png" alt="Calendar and to-dos in the Naazhi Android app" className="w-[46%] -rotate-3" />
                <Phone src="/mobile/journal-2.png" alt="The journal in the Naazhi Android app" className="w-[46%] translate-y-8 rotate-3" />
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section tight>
        <SectionHead kicker="Good to know" title="Built for" quiet="every screen." />
        <FeatureCards
          cols={3}
          items={[
            { icon: faMobileScreen, t: "Phones", d: "The calendar opens on the agenda and every screen works at phone width." },
            { icon: faTabletScreenButton, t: "Tablets", d: "Roomier layouts on larger screens, with the same shortcuts and views." },
            { icon: faArrowDown, t: "Updates", d: "New versions are published on the releases page and listed in the changelog." },
          ]}
        />
      </Section>

      <Section tight>
        <SectionHead kicker="Download FAQ" title="Straight" quiet="answers." />
        <div className="mx-auto mt-[clamp(28px,4vw,48px)] max-w-3xl">
          <FaqList items={faqs} />
        </div>
      </Section>

      <CtaPanel
        title="Ready when"
        quiet="you are."
        lead="Download the Android app, or start in the browser and pick it up on your phone later."
        primary={["Get started", "/signup"]}
        secondary={["See what’s new", "/changelog"]}
        phone="/mobile/home-2.png"
      />
    </main>
  );
}

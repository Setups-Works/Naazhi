import type { Metadata } from "next";
import { FontAwesomeIcon as FA } from "@fortawesome/react-fontawesome";
import { faBan, faCheck, faCodeBranch, faFileExport, faKey, faPlugCircleCheck, faUserLock } from "@fortawesome/free-solid-svg-icons";
import { AccessMatrix } from "../../components/site/blocks";
import JsonLd from "../../components/site/JsonLd";
import { pageMeta, pageSchemas } from "../../lib/seo";
import { TRUST } from "../../components/site/content";
import { Heading } from "../../components/site/Heading";
import { CtaPanel, FeatureCards, PageHero, SectionHead } from "../../components/site/kit";
import { R, Reveal } from "../../components/site/Reveal";
import { Tip } from "../../components/site/Tip";
import { buttonClass, IconBadge, Kicker, Lead, Section, Surface } from "../../components/site/ui";

const SEO = {
  name: "Privacy & Security",
  title: "Privacy & Security — Naazhi",
  description: "How Naazhi keeps your workspace yours: separate from your AI, connected only to what you choose, and always exportable.",
  path: "/privacy-security",
};
export const metadata: Metadata = pageMeta(SEO);

const access = [
  { what: "Your notes, tasks and chats", who: "You", note: "Protected by row-level security in the database, not only by the interface." },
  { what: "Your journal", who: "Only you", note: "Private to its author, even in a shared workspace." },
  {
    what: "A chat you share",
    who: "Anyone with the link",
    note: "A read-only page on an unguessable link. Stop sharing and the link stops working at once.",
  },
  { what: "Your uploaded files", who: "You", note: "Kept in private storage and opened through short-lived signed links." },
  {
    what: "Admins of the service",
    who: "Counts and ids, never content",
    note: "Admin tools are built so they cannot show your notes, journal or chats. Admin actions are logged.",
  },
  {
    what: "An AI provider",
    who: "Only what you send it",
    note: "Nothing goes to a model you haven’t chosen. In AI-free mode nothing goes at all.",
  },
];

export default function Page() {
  return (
    <main>
      <JsonLd data={pageSchemas(SEO)} />
      <PageHero
        eyebrow="Privacy & Security"
        title="Your workspace stays"
        quiet="yours."
        lead="Your notes, journal and mail are personal. Naazhi is designed so that you decide what connects, whether AI is involved at all, and how to take your work with you."
      >
        <a className={buttonClass("primary")} href="#principles">
          Read our principles
        </a>
      </PageHero>

      <Section id="principles" tight>
        <SectionHead kicker="Principles" title="Control is the" quiet="default." />
        <FeatureCards
          items={[
            {
              icon: faCodeBranch,
              t: "Workspace separate from AI",
              d: "Your content lives in your workspace, not inside an AI provider. Change models or providers and nothing moves.",
              tone: "green",
            },
            {
              icon: faBan,
              t: "AI-free mode",
              d: "Use AI when it helps, or keep the workspace fully AI-free. Nothing is sent to a model you haven’t chosen.",
              tone: "clay",
            },
            {
              icon: faKey,
              t: "Bring your own key",
              d: "Connect your own API key and provider directly, so you stay in control of that relationship.",
              tone: "violet",
            },
            {
              icon: faPlugCircleCheck,
              t: "You choose what connects",
              d: "Gmail, Google Calendar and other tools are connected by you, one at a time, and only the ones you pick.",
              tone: "blue",
            },
            {
              icon: faUserLock,
              t: "A journal that’s private",
              d: "Your journal is a private record of your days, kept separate from the rest of the workspace.",
              tone: "amber",
            },
            {
              icon: faFileExport,
              t: "Take your work with you",
              d: "Import and export are built in, so you’re never locked in.",
              tone: "mint",
            },
          ]}
        />
      </Section>

      <Section tight>
        <SectionHead
          kicker="Your account"
          title="Signing in,"
          quiet="done carefully."
          lead="The ways to sign in today, and what protects them. Hover a card for the detail."
        />
        <Reveal stagger={0.08} className="mt-[clamp(28px,4vw,52px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRUST.map((t) => (
            <R key={t.t}>
              <Tip content={t.tip} className="flex h-full w-full">
                <Surface lift className="flex h-full w-full flex-col gap-3 p-6" role="group" aria-label={t.t}>
                  <IconBadge icon={t.icon} />
                  <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.01em] text-fg">{t.t}</h3>
                  <p className="text-[15px] leading-relaxed text-fg-muted">{t.d}</p>
                </Surface>
              </Tip>
            </R>
          ))}
        </Reveal>
      </Section>

      <Section tight>
        <SectionHead
          kicker="Who can see what"
          title="Plainly,"
          quiet="in a table."
          lead="No vague promises. For each kind of data, who can see it and why."
        />
        <AccessMatrix rows={access} />
      </Section>

      <Section tight>
        <Reveal>
          <Surface variant="ink" radius="r5" className="overflow-hidden p-[clamp(24px,5vw,64px)]">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div className="flex flex-col items-start gap-5">
                <Kicker dark>In the open</Kicker>
                <Heading dark quiet="published before launch.">
                  Security details,
                </Heading>
                <Lead dark>
                  We don’t make security claims we haven’t documented. Before launch we’ll publish how data is stored and protected, which
                  permissions each connection asks for, and how long anything is kept.
                </Lead>
              </div>
              <ul className="grid gap-3">
                {[
                  "How your data is stored and protected",
                  "Permissions requested by each integration",
                  "Data retention and deletion",
                  "How AI providers are called, and what they receive",
                ].map((x) => (
                  <li
                    key={x}
                    className="flex items-center gap-3.5 rounded-r3 bg-on-dark/5 px-4 py-3.5 text-[15px] ring-1 ring-on-dark/15"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-on-dark/15">
                      <FA icon={faCheck} className="text-[12px]" />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </Surface>
        </Reveal>
      </Section>

      <CtaPanel
        title="Questions about"
        quiet="your data?"
        lead="Start with the notes, connect only what you want, and keep AI off until you’re ready."
        primary={["Get started", "/signup"]}
        secondary={["Read the FAQ", "/#faq"]}
        phone="/mobile/journal.png"
      />
    </main>
  );
}

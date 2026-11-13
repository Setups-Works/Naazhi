import type { Metadata } from "next";
import { Icon as FA } from "@/components/ui/Icon";
import { faBan, faBug, faCheck, faEnvelope, faHandshake, faMagnifyingGlass, faWrench } from "@fortawesome/free-solid-svg-icons";
import { StepCards } from "../../components/site/blocks";
import JsonLd from "../../components/site/JsonLd";
import { CtaPanel, PageHero, SectionHead } from "../../components/site/kit";
import { R, Reveal } from "../../components/site/Reveal";
import { buttonClass, Section, Surface } from "../../components/site/ui";
import { LEGAL_UPDATED, LEGAL_UPDATED_ISO, OPERATOR } from "../../lib/legal";
import { pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "Responsible Disclosure",
  title: "Report a Security Issue — Naazhi",
  description: "Found a vulnerability in Naazhi? How to report it safely, what is in scope, and what to expect from us.",
  path: "/responsible-disclosure",
};
export const metadata: Metadata = pageMeta(SEO);

const IN_SCOPE = [
  "The Naazhi website and web app",
  "The Naazhi Android app",
  "Our sign-in, sharing and billing flows",
  "Anything that exposes another person’s notes, journal, chats or files",
];
const OUT_OF_SCOPE = [
  "Denial-of-service or load testing",
  "Spam, phishing or social engineering of our team or users",
  "Physical attacks, or attacks on our hosting providers or other companies’ services",
  "Reports from automated scanners with no demonstrated impact",
];
const RULES = [
  "Use only your own account and data. Don’t read, change or keep anyone else’s data.",
  "Stop as soon as you have shown the problem, and don’t go further than you must.",
  "Give us reasonable time to fix it before you share details with anyone else.",
  "Don’t degrade the service for other people.",
];

const STEPS = [
  { icon: faEnvelope, t: "Send a report", d: "Email us the details, from an address we can reply to.", pts: ["What you found and where", "Steps to reproduce it", "What you think the impact is"] },
  { icon: faMagnifyingGlass, t: "We confirm", d: "We read every report and reply to say we have it.", pts: ["Within 3 working days", "We may ask a question"] },
  { icon: faWrench, t: "We fix", d: "We work on a fix and keep you posted on how it is going.", pts: ["We tell you when it is fixed", "We keep your details private"] },
  { icon: faHandshake, t: "We thank you", d: "With your permission, we credit you for the find.", pts: ["Credit is optional and your choice"] },
] as const;

export default function Page() {
  return (
    <main>
      <JsonLd data={pageSchemas({ ...SEO, dateModified: LEGAL_UPDATED_ISO })} />
      <PageHero
        eyebrow="Security"
        title="Found a bug?"
        quiet="Tell us first."
        lead="Your notes and journal are personal, so we take security reports seriously. Here is how to report a problem safely and what you can expect from us."
      >
        <a className={buttonClass("primary")} href={`mailto:${OPERATOR.email}?subject=Security%20report`}>
          Email a security report
        </a>
        <a className={buttonClass("secondary")} href="#scope">
          What is in scope
        </a>
      </PageHero>

      <Section id="scope" tight>
        <SectionHead kicker="Scope" title="What to test," quiet="and what not to." />
        <Reveal stagger={0.1} className="mt-[clamp(28px,4vw,52px)] grid gap-4 md:grid-cols-2">
          <R>
            <Surface variant="soft" className="flex h-full flex-col gap-4 p-6 sm:p-8">
              <h3 className="flex items-center gap-2.5 font-serif text-[26px] font-semibold tracking-[-0.02em]">
                <span className="grid size-8 place-items-center rounded-full bg-green-bg text-green-fg">
                  <FA icon={faBug} className="text-[14px]" />
                </span>
                In scope
              </h3>
              <ul className="flex flex-col gap-3">
                {IN_SCOPE.map((x) => (
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
                Out of scope
              </h3>
              <ul className="flex flex-col gap-3">
                {OUT_OF_SCOPE.map((x) => (
                  <li key={x} className="flex gap-3 text-[15px] leading-relaxed text-fg">
                    <FA icon={faBan} className="mt-1.5 shrink-0 text-[12px] text-clay-fg" />
                    {x}
                  </li>
                ))}
              </ul>
            </Surface>
          </R>
        </Reveal>
      </Section>

      <Section tight>
        <SectionHead kicker="Ground rules" title="Test with" quiet="care." lead="Good-faith research that follows these rules is welcome. We will not take action against you for it." />
        <Reveal className="mt-[clamp(28px,4vw,48px)]">
          <Surface className="mx-auto max-w-[820px] p-6 sm:p-8">
            <ol className="flex flex-col gap-4">
              {RULES.map((x, i) => (
                <li key={x} className="flex gap-4 text-[15.5px] leading-relaxed text-fg">
                  <span className="font-serif text-[28px] leading-none font-semibold text-green-fg/40 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  {x}
                </li>
              ))}
            </ol>
          </Surface>
        </Reveal>
      </Section>

      <Section tight>
        <SectionHead kicker="What happens next" title="From report" quiet="to fix." />
        <StepCards steps={STEPS} />
        <p className="mt-6 text-center text-[13px] text-fg-subtle">
          This page is also published in machine-readable form at{" "}
          <a className="text-green-fg underline underline-offset-2" href="/.well-known/security.txt">
            /.well-known/security.txt
          </a>
          . Last updated {LEGAL_UPDATED}. We don’t run a paid bounty programme.
        </p>
      </Section>

      <CtaPanel title="See something" quiet="worrying?" lead="Write to us now. A short report is better than none." primary={["Contact us", "/contact"]} secondary={["Privacy & Security", "/privacy-security"]} />
    </main>
  );
}

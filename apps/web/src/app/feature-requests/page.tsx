import type { Metadata } from "next";
import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import { faBullseye, faEnvelope, faLightbulb, faMagnifyingGlass, faPenToSquare, faReply, faRoute } from "@fortawesome/free-solid-svg-icons";
import { StepCards } from "../../components/site/blocks";
import { CAPABILITIES } from "../../components/site/content";
import JsonLd from "../../components/site/JsonLd";
import { CtaPanel, FeatureCards, PageHero, SectionHead } from "../../components/site/kit";
import { Reveal } from "../../components/site/Reveal";
import { buttonClass, Section, StatusChip, Surface, TextLink } from "../../components/site/ui";
import { OPERATOR } from "../../lib/legal";
import { pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "Request a Feature",
  title: "Request a Feature — Naazhi",
  description: "Tell us what Naazhi should do next. How to send a feature request, what to include, and what happens to it.",
  path: "/feature-requests",
};
export const metadata: Metadata = pageMeta(SEO);

const ON_THE_LIST = CAPABILITIES.filter((c) => c.status !== "live");

// The email opens with the questions that make a request easy to act on, so people fill in blanks instead of facing an empty page.
const TEMPLATE = [
  "What I was trying to do:",
  "",
  "What happened, or what I couldn’t do:",
  "",
  "What I would like Naazhi to do instead:",
  "",
  "How often this comes up (daily, weekly, rarely):",
  "",
  "Device (web, Android, iPhone or iPad):",
].join("\n");
const MAILTO = `mailto:${OPERATOR.email}?subject=${encodeURIComponent("Feature request")}&body=${encodeURIComponent(TEMPLATE)}`;

const STEPS = [
  { icon: faLightbulb, t: "Describe the need", d: "Tell us what you were trying to do, not only the feature you have in mind.", pts: ["What you were doing", "What got in the way"] },
  { icon: faMagnifyingGlass, t: "We read it", d: "A person reads every request and checks it against the roadmap.", pts: ["We reply within 3 working days", "We may ask a question"] },
  { icon: faRoute, t: "We place it", d: "It joins the roadmap, is merged with a similar request, or we tell you why it doesn’t fit.", pts: ["Planned, Building or not now", "Honest about which"] },
  { icon: faReply, t: "We tell you", d: "If we build it, we let you know, and it appears in the changelog marked live.", pts: ["Listed in the changelog", "Credited only if you say so"] },
] as const;

export default function Page() {
  return (
    <main>
      <JsonLd data={pageSchemas(SEO)} />
      <PageHero
        eyebrow="Feature requests"
        title="What should Naazhi do"
        quiet="next?"
        lead="The best ideas come from an ordinary week of real use. Tell us what you tried to do and couldn’t, and we will tell you what we make of it."
      >
        <a className={buttonClass("primary")} href={MAILTO}>
          <FA icon={faEnvelope} className="mr-2 text-[14px]" />
          Send a feature request
        </a>
        <Link className={buttonClass("secondary")} href="/roadmap">
          See the roadmap first
        </Link>
      </PageHero>

      <Section tight>
        <SectionHead kicker="Before you write" title="Already on" quiet="the list?" lead="These are being built or planned. If your idea is one of them, a short note saying it matters to you is just as useful." />
        <Reveal className="mt-[clamp(28px,4vw,48px)]">
          <Surface className="mx-auto max-w-[820px] overflow-hidden">
            <ul className="divide-y divide-line">
              {ON_THE_LIST.map((c) => (
                <li key={c.t} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[15.5px] font-medium text-fg">{c.t}</p>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-fg-muted">{c.d}</p>
                  </div>
                  <StatusChip status={c.status} />
                </li>
              ))}
            </ul>
          </Surface>
          <p className="mx-auto mt-4 max-w-[820px] text-[14px] text-fg-subtle">
            The full picture is on the <TextLink href="/roadmap">roadmap</TextLink>.
          </p>
        </Reveal>
      </Section>

      <Section tight>
        <SectionHead kicker="A good request" title="Three things" quiet="that help." />
        <FeatureCards
          items={[
            { icon: faBullseye, t: "The goal, not just the feature", d: "“I want to find last month’s notes quickly” tells us more than “add a calendar filter”.", tone: "green" },
            { icon: faPenToSquare, t: "A real example", d: "What you wrote, where you looked, and what you expected to see.", tone: "blue" },
            { icon: faRoute, t: "How often it matters", d: "Daily friction and a once-a-year wish are both welcome, and they are planned differently.", tone: "violet" },
          ]}
        />
      </Section>

      <Section tight>
        <SectionHead kicker="What happens next" title="From idea" quiet="to answer." />
        <StepCards steps={STEPS} />
      </Section>

      <Section tight>
        <Reveal>
          <Surface variant="soft" radius="r5" className="mx-auto flex max-w-[900px] flex-col gap-4 p-[clamp(24px,5vw,56px)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-[clamp(24px,3vw,32px)] leading-tight font-semibold tracking-[-0.02em]">Ready to send it?</h2>
              <p className="mt-2 max-w-[460px] text-[15px] leading-relaxed text-fg-muted">
                The button opens an email with a few questions to fill in. Prefer your own words? Write to{" "}
                <a className="text-green-fg underline underline-offset-2" href={`mailto:${OPERATOR.email}?subject=Feature%20request`}>
                  {OPERATOR.email}
                </a>
                .
              </p>
            </div>
            <a className={`${buttonClass("primary")} shrink-0`} href={MAILTO}>
              Send a feature request
            </a>
          </Surface>
          <p className="mx-auto mt-4 max-w-[900px] text-[13px] leading-relaxed text-fg-subtle">
            Please don’t include passwords or private notes. We use what you send only to answer you and to decide what to build, as described in the{" "}
            <Link className="text-green-fg underline underline-offset-2" href="/privacy">
              Privacy Policy
            </Link>
            . Sending an idea doesn’t guarantee we will build it.
          </p>
        </Reveal>
      </Section>

      <CtaPanel title="Prefer to try it" quiet="first?" lead="Use what is live today, then tell us what is missing." primary={["Get started", "/signup"]} secondary={["Become an early user", "/early-users"]} />
    </main>
  );
}

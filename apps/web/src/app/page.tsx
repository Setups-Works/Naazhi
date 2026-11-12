import type { Metadata } from "next";
import { CAPABILITIES, FAQS } from "../components/site/content";
import Link from "next/link";
import JsonLd from "../components/site/JsonLd";
import { RELEASES } from "../features/changelog/releases";
import { faqSchema, itemListSchema, SITE_DESCRIPTION, softwareSchema, webPageSchema } from "../lib/seo";
import { FaqList } from "../components/site/Faq";
import { Heading } from "../components/site/Heading";
import { CtaPanel } from "../components/site/kit";
import { Reveal } from "../components/site/Reveal";
import Ai from "../components/site/home/Ai";
import Collaboration from "../components/site/home/Collaboration";
import Capabilities from "../components/site/home/Capabilities";
import HealthConnect from "../components/site/home/HealthConnect";
import Hero from "../components/site/home/Hero";
import Integrations, { IntegrationsTicker } from "../components/site/home/Integrations";
import Pro from "../components/site/home/Pro";
import Shortcuts from "../components/site/home/Shortcuts";
import Upcoming from "../components/site/home/Upcoming";
import Story from "../components/site/home/Story";
import Trust from "../components/site/home/Trust";
import WhatsNew from "../components/site/home/WhatsNew";
import AuthLink from "../components/auth/AuthLink";
import { buttonClass, Kicker, Lead, Section } from "../components/site/ui";

// The first few answers; the rest live on /faq, so the page stays short and the FAQ markup matches what is shown.
const HOME_FAQS = FAQS.slice(0, 6);

// Only what ships today, straight from the capability list (its `status` is kept honest by a test).
const LIVE_FEATURES = CAPABILITIES.filter((c) => c.status === "live").map((c) => c.t);

const APP_VERSION = RELEASES.find((r) => r.appVersion)?.appVersion;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Naazhi", title: "Naazhi — one workspace, any AI", description: SITE_DESCRIPTION, url: "/" },
};

export default function Page() {
  return (
    <main>
      <JsonLd
        data={[
          softwareSchema({
            version: APP_VERSION,
            features: LIVE_FEATURES,
            screenshots: [
              "/mobile/home-2.png",
              "/mobile/notes-2.png",
              "/mobile/todo-2.png",
              "/mobile/journal-2.png",
              "/mobile/ipad-screen.png",
            ],
          }),
          itemListSchema({
            name: "What Naazhi does today",
            path: "/",
            items: CAPABILITIES.filter((c) => c.status === "live").map((c) => ({ name: c.t, description: c.d })),
          }),
          faqSchema(HOME_FAQS),
          webPageSchema({
            name: "Naazhi — one workspace, any AI",
            description: SITE_DESCRIPTION,
            path: "/",
            dateModified: RELEASES[0]?.date,
          }),
        ]}
      />
      <Hero />
      <IntegrationsTicker />
      <Story />
      <Collaboration />
      <HealthConnect />
      <Capabilities />
      <Upcoming />
      <Integrations />
      <WhatsNew />
      <Shortcuts />
      <Ai />
      <Trust />
      <Pro />

      <Section id="faq">
        <div className="grid items-start gap-[clamp(28px,5vw,72px)] lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col items-start gap-5 lg:sticky lg:top-28">
            <Reveal>
              <Kicker>FAQ</Kicker>
            </Reveal>
            <Heading quiet="questions.">Good</Heading>
            <Reveal delay={150}>
              <Lead>Quick answers about AI, accounts and your data. Still unsure? Start with the notes and connect the rest later.</Lead>
            </Reveal>
            <Reveal delay={250}>
              <AuthLink arrow className={buttonClass("primary")} />
            </Reveal>
          </div>
          <div>
            <FaqList items={HOME_FAQS} />
            <Reveal className="mt-6">
              <Link href="/faq" className={buttonClass("secondary")}>
                See all {FAQS.length} questions
              </Link>
            </Reveal>
          </div>
        </div>
      </Section>

      <CtaPanel
        title="Bring it all"
        quiet="together."
        lead="One workspace for personal and work information, on the web and in your pocket. Start with the notes, and connect the rest when you’re ready."
        secondary={["Browse integrations", "/#integrations"]}
        phone="/mobile/home-2.png"
      />
    </main>
  );
}

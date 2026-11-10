import type { Metadata } from "next";
import { FAQS } from "../components/site/content";
import JsonLd from "../components/site/JsonLd";
import { RELEASES } from "../features/changelog/releases";
import { faqSchema, SITE_DESCRIPTION, softwareSchema, webPageSchema } from "../lib/seo";
import { FaqList } from "../components/site/Faq";
import { Heading } from "../components/site/Heading";
import { CtaPanel } from "../components/site/kit";
import { Reveal } from "../components/site/Reveal";
import Ai from "../components/site/home/Ai";
import Capabilities from "../components/site/home/Capabilities";
import Hero from "../components/site/home/Hero";
import Integrations, { IntegrationsTicker } from "../components/site/home/Integrations";
import Pro from "../components/site/home/Pro";
import Shortcuts from "../components/site/home/Shortcuts";
import Story from "../components/site/home/Story";
import Trust from "../components/site/home/Trust";
import AuthLink from "../components/auth/AuthLink";
import { buttonClass, Kicker, Lead, Section } from "../components/site/ui";

const APP_VERSION = RELEASES.find((r) => r.appVersion)?.appVersion;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: "Naazhi", title: "Naazhi — one workspace, any AI", description: SITE_DESCRIPTION, url: "/" },
};

export default function Page() {
  return (
    <main>
      <JsonLd data={[softwareSchema({ version: APP_VERSION }), faqSchema(FAQS), webPageSchema({ name: "Naazhi — one workspace, any AI", description: SITE_DESCRIPTION, path: "/" })]} />
      <Hero />
      <IntegrationsTicker />
      <Story />
      <Capabilities />
      <Integrations />
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
          <FaqList items={FAQS} />
        </div>
      </Section>

      <CtaPanel
        title="Bring it all"
        quiet="together."
        lead="One workspace for personal and work information, on the web and in your pocket. Start with the notes, and connect the rest when you’re ready."
        secondary={["Browse integrations", "/#integrations"]}
        phone="/mobile/home.png"
      />
    </main>
  );
}

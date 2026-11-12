import type { Metadata } from "next";
import ClientOnly from "../../components/app/ClientOnly";
import JsonLd from "../../components/site/JsonLd";
import { CtaPanel, PageHero } from "../../components/site/kit";
import { RELEASES } from "../../features/changelog/releases";
import { pageMeta, pageSchemas, releasesSchema } from "../../lib/seo";
import { Section } from "../../components/site/ui";
import Changelog from "../../features/changelog/Changelog";

const SEO = {
  name: "Changelog",
  title: "Changelog — Naazhi",
  description: "What’s new in the web app and the Android app, newest first.",
  path: "/changelog",
};
export const metadata: Metadata = pageMeta(SEO);

export default function Page() {
  return (
    <main>
      <JsonLd data={[...pageSchemas({ ...SEO, dateModified: RELEASES[0]?.date }), releasesSchema(RELEASES)]} />
      <PageHero
        eyebrow="Changelog"
        title="What’s new,"
        quiet="newest first."
        lead="Every change people can see, in the web app and the Android app. App releases link to their download on GitHub."
      />
      <Section tight>
        <ClientOnly>
          <Changelog />
        </ClientOnly>
      </Section>
      <CtaPanel
        title="Want to shape"
        quiet="what ships next?"
        lead="Early users get a direct line to the team, and what you tell us shows up here."
        primary={["Get started", "/signup"]}
        secondary={["Early users", "/early-users"]}
      />
    </main>
  );
}

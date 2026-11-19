import type { Metadata } from "next";
import ClientOnly from "../../components/app/ClientOnly";
import JsonLd from "../../components/site/JsonLd";
import { CtaPanel, PageHero } from "../../components/site/kit";
import { RELEASES } from "../../features/changelog/releases";
import { pageMeta, pageSchemas, releasesSchema } from "../../lib/seo";
import Link from "next/link";
import { buttonClass, Section } from "../../components/site/ui";
import Changelog from "../../features/changelog/Changelog";

const SEO = {
  name: "Changelog",
  title: "Changelog — Naazhi",
  description: "Every Naazhi release, newest first: new features, fixes and improvements in the web app and the Android app, each with its date and version number.",
  path: "/changelog",
};
export const metadata: Metadata = pageMeta({ ...SEO, ownImage: true });

export default function Page() {
  return (
    <main>
      <JsonLd data={[...pageSchemas({ ...SEO, dateModified: RELEASES[0]?.date }), releasesSchema(RELEASES)]} />
      <PageHero
        eyebrow="Changelog"
        title="What’s new,"
        quiet="newest first."
        lead="Every change people can see, in the web app and the Android app. App releases link to their download on GitHub."
      >
        <Link className={buttonClass("secondary")} href="/roadmap">
          See what’s planned
        </Link>
      </PageHero>
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
        secondary={["See the roadmap", "/roadmap"]}
      />
    </main>
  );
}

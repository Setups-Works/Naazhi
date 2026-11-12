import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "../../components/site/JsonLd";
import OpenOnHash from "../../components/site/OpenOnHash";
import { FaqList } from "../../components/site/Faq";
import { FAQ_GROUPS, faqSlug } from "../../components/site/faqGroups";
import { FAQS } from "../../components/site/content";
import { CtaPanel, PageHero } from "../../components/site/kit";
import { Reveal } from "../../components/site/Reveal";
import { Section } from "../../components/site/ui";
import { RELEASES } from "../../features/changelog/releases";
import { faqSchema, pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "FAQ",
  title: "FAQ — Naazhi",
  description:
    "Straight answers about Naazhi: whether you have to use AI, how your journal stays private, what works today, how to pay, and which apps connect.",
  path: "/faq",
};
export const metadata: Metadata = pageMeta({ ...SEO, ownImage: true });

export default function Page() {
  return (
    <main>
      <JsonLd
        data={[
          ...pageSchemas({ ...SEO, image: "/faq/opengraph-image", dateModified: RELEASES[0]?.date }),
          faqSchema(FAQS, {
            path: SEO.path,
            name: SEO.title,
            description: SEO.description,
            dateModified: RELEASES[0]?.date,
            anchor: faqSlug,
          }),
        ]}
      />
      <OpenOnHash />
      <PageHero
        eyebrow="FAQ"
        title="Good questions,"
        quiet="straight answers."
        lead="AI, privacy, plans, apps and what works today. If something here isn’t clear, ask us and we’ll fix the answer."
      >
        <nav aria-label="Jump to a topic" className="flex flex-wrap justify-center gap-2">
          {FAQ_GROUPS.map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="rounded-pill bg-surface px-4 py-2 text-[14px] font-medium text-fg ring-1 ring-line transition-colors hover:bg-surface-muted"
            >
              {g.title}
            </a>
          ))}
        </nav>
      </PageHero>

      {FAQ_GROUPS.map((g, i) => (
        <Section key={g.id} id={g.id} tight band={i % 2 ? "soft" : "plain"}>
          <div className="mx-auto grid max-w-5xl items-start gap-[clamp(24px,5vw,64px)] lg:grid-cols-[0.7fr_1.3fr]">
            <Reveal className="flex flex-col gap-2 lg:sticky lg:top-28">
              <h2 className="m-0 font-serif font-semibold text-[clamp(28px,3.4vw,40px)] leading-[1.08] tracking-[-0.025em]">{g.title}</h2>
              <p className="m-0 text-[16px] leading-relaxed text-fg-muted">{g.lead}</p>
            </Reveal>
            <div>
              <FaqList items={g.items} anchor={faqSlug} />
            </div>
          </div>
        </Section>
      ))}

      <CtaPanel
        title="Still wondering?"
        quiet="Ask us."
        lead="Write to the team and you will get a real answer. Or see what has changed lately."
        primary={["Contact us", "/contact"]}
        secondary={["Read the changelog", "/changelog"]}
      />
      <p className="sr-only">
        <Link href="/">Back to the Naazhi home page</Link>
      </p>
    </main>
  );
}

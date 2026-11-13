import type { Metadata } from "next";
import { faClockRotateLeft, faCompass, faDiagramProject, faLink } from "@fortawesome/free-solid-svg-icons";
import GraphDemo from "../../components/demos/GraphDemo";
import JsonLd from "../../components/site/JsonLd";
import { pageMeta, pageSchemas } from "../../lib/seo";
import { CtaPanel, FeatureCards, PageHero, SectionHead } from "../../components/site/kit";
import { Reveal } from "../../components/site/Reveal";
import { buttonClass, Section, StatusChip, Surface } from "../../components/site/ui";

const SEO = {
  name: "Context Graph",
  title: "Context Graph — Naazhi",
  description: "See how your notes, tasks, emails, meetings and journal entries connect to each other.",
  path: "/context-graph",
};
export const metadata: Metadata = pageMeta({ ...SEO, ownImage: true });

export default function Page() {
  return (
    <main>
      <JsonLd data={pageSchemas(SEO)} />
      <PageHero
        eyebrow="Context Graph"
        status={<StatusChip status="soon" />}
        title="See how everything"
        quiet="connects."
        lead="A launch plan, the email thread behind it, the meeting that decided it and the task that follows. The Context Graph shows how your work relates, so nothing sits in isolation."
      >
        <a className={buttonClass("primary")} href="#explore">
          Explore the graph
        </a>
      </PageHero>

      <Section id="explore" tight>
        <Reveal>
          <Surface variant="soft" radius="r5" className="p-[clamp(14px,3vw,36px)]">
            <GraphDemo />
          </Surface>
        </Reveal>
        <p className="mt-4 text-center text-[13.5px] text-fg-subtle">
          An illustration with sample data. The Context Graph is planned and not available yet.
        </p>
      </Section>

      <Section tight>
        <SectionHead
          kicker="Built on connections"
          title="Backlinks and an atlas,"
          quiet="across your whole workspace."
          lead="Notes will link to each other first. The Context Graph then carries that idea to your tasks, journal, calendar and, later, email and meetings."
        />
        <FeatureCards
          cols={4}
          items={[
            {
              icon: faLink,
              t: "Connections you can follow",
              d: "Jump from a note to the task, entry or event it’s tied to.",
              tone: "violet",
            },
            {
              icon: faDiagramProject,
              t: "See the shape of a project",
              d: "Everything around a project in one view, instead of five tabs.",
              tone: "blue",
            },
            {
              icon: faClockRotateLeft,
              t: "Context that comes back",
              d: "Return to an idea weeks later and see what surrounded it.",
              tone: "amber",
            },
            {
              icon: faCompass,
              t: "Yours, not the AI’s",
              d: "Connections live in your workspace and stay when you change AI providers.",
              tone: "clay",
            },
          ]}
        />
      </Section>

      <CtaPanel
        title="Make your work"
        quiet="make sense."
        lead="Start in one workspace and let the context build itself around you."
        secondary={["Try Universal Search", "/universal-search"]}
      />
    </main>
  );
}

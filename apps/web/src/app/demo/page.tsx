import type { Metadata } from "next";
import { faCheckDouble, faEnvelopeOpenText, faHandPointer, faToggleOn } from "@fortawesome/free-solid-svg-icons";
import DemoApp from "../../components/demo/DemoApp";
import JsonLd from "../../components/site/JsonLd";
import { pageMeta, pageSchemas } from "../../lib/seo";
import { CtaPanel, FeatureCards, PageHero, SectionHead } from "../../components/site/kit";
import { Reveal } from "../../components/site/Reveal";
import { buttonClass, Section, Surface } from "../../components/site/ui";

const SEO = {
  name: "Product demo",
  title: "Product demo — Naazhi",
  description: "Click around an interactive preview of the workspace: notes, to-do, email, calendar, meetings and automations.",
  path: "/demo",
};
export const metadata: Metadata = pageMeta(SEO);

export default function Page() {
  return (
    <main>
      <JsonLd data={pageSchemas(SEO)} />
      <PageHero
        eyebrow="Product demo"
        title="Try the workspace"
        quiet="right here."
        lead="A working preview of the workspace. Search with ⌘K, write notes, reply to mail, plan your week, record a meeting and turn AI off, and it all responds. Nothing to install, nothing to sign up for."
      >
        <a className={buttonClass("primary")} href="#demo">
          Start clicking
        </a>
      </PageHero>

      <Section id="demo" tight>
        <Reveal>
          <Surface radius="r5" className="mx-auto max-w-[1240px] bg-surface-muted p-2 sm:p-3">
            <div className="overflow-hidden rounded-r4">
              <DemoApp />
            </div>
          </Surface>
        </Reveal>
        <p className="mt-4 text-center text-[13.5px] text-fg-subtle">
          Preview with sample data. It shows email, meetings and automations as they are planned; the live product connects to your own
          notes, tasks, journal and calendar today, with the rest arriving over time.
        </p>
      </Section>

      <Section tight>
        <SectionHead kicker="Things to try" title="Four quick" quiet="experiments." />
        <FeatureCards
          cols={4}
          items={[
            {
              icon: faHandPointer,
              t: "Switch areas",
              d: "Use the left menu to jump between Notes, Email, Calendar and more.",
              tone: "blue",
            },
            { icon: faCheckDouble, t: "Tick a task", d: "Complete one in Notes and watch it update in To-do and Home.", tone: "amber" },
            {
              icon: faEnvelopeOpenText,
              t: "Open a thread",
              d: "Pick a message in Email to read it with Reply and Forward options.",
              tone: "clay",
            },
            { icon: faToggleOn, t: "Flip an automation", d: "Turn rules on and off in Automations.", tone: "violet" },
          ]}
        />
      </Section>

      <CtaPanel
        title="Like what"
        quiet="you see?"
        lead="Bring your own notes, tasks and calendar into the real thing."
        secondary={["How it works", "/how-it-works"]}
      />
    </main>
  );
}

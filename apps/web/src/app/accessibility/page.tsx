import type { Metadata } from "next";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowsLeftRight, faCheck, faKeyboard, faMobileScreen, faPersonWalking, faUniversalAccess, faWandMagicSparkles } from "@fortawesome/free-solid-svg-icons";
import JsonLd from "../../components/site/JsonLd";
import { CtaPanel, FeatureCards, PageHero, SectionHead } from "../../components/site/kit";
import { Reveal } from "../../components/site/Reveal";
import { Section, Surface } from "../../components/site/ui";
import { LEGAL_UPDATED, LEGAL_UPDATED_ISO, OPERATOR } from "../../lib/legal";
import { pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "Accessibility",
  title: "Accessibility — Naazhi",
  description: "How Naazhi aims to be usable by everyone: keyboard, screen readers, reduced motion and small screens, and how to tell us about a barrier.",
  path: "/accessibility",
};
export const metadata: Metadata = pageMeta(SEO);

export default function Page() {
  return (
    <main>
      <JsonLd data={pageSchemas({ ...SEO, dateModified: LEGAL_UPDATED_ISO })} />
      <PageHero
        eyebrow="Accessibility"
        title="Made to be used by"
        quiet="everyone."
        lead="We want Naazhi to work whether you use a mouse, a keyboard, a screen reader or a phone in one hand. Here is what we do, where we fall short, and how to tell us."
      />

      <Section tight>
        <SectionHead kicker="What we do" title="Built in," quiet="not bolted on." />
        <FeatureCards
          items={[
            { icon: faKeyboard, t: "Keyboard first", d: "Buttons and links are real controls with visible focus, and dialogs and menus can be used without a mouse.", tone: "green" },
            { icon: faUniversalAccess, t: "Screen readers", d: "Headings, labels and landmarks describe each page, and icons that carry meaning have text alternatives.", tone: "blue" },
            { icon: faWandMagicSparkles, t: "Reduced motion", d: "Animations stop if your device asks for less motion, and the app has its own Reduce motion setting.", tone: "violet" },
            { icon: faMobileScreen, t: "Small screens", d: "Every page is designed to work at phone width, with no sideways scrolling.", tone: "amber" },
            { icon: faArrowsLeftRight, t: "Readable text", d: "Text is real text that scales with your browser settings, set in a clear typeface with strong contrast.", tone: "clay" },
            { icon: faPersonWalking, t: "No time pressure", d: "Nothing on these pages disappears or expires while you are reading it.", tone: "mint" },
          ]}
        />
      </Section>

      <Section tight>
        <div className="mx-auto grid max-w-[920px] gap-4 md:grid-cols-2">
          <Surface variant="soft" className="flex flex-col gap-3 p-6 sm:p-8">
            <h3 className="font-serif text-[24px] font-semibold tracking-[-0.02em]">Our aim</h3>
            <p className="text-[15px] leading-relaxed text-fg-muted">
              We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2, level AA. We check new pages by keyboard and at phone width before they go
              live. We have not had an independent accessibility audit yet, so we do not claim full conformance.
            </p>
          </Surface>
          <Surface className="flex flex-col gap-3 p-6 sm:p-8">
            <h3 className="font-serif text-[24px] font-semibold tracking-[-0.02em]">Known gaps</h3>
            <ul className="flex flex-col gap-2.5 text-[15px] leading-relaxed text-fg-muted">
              {[
                "Some app screens, such as the graph view, are mainly visual and have limited alternatives.",
                "Screenshots on this site are pictures of the app, described in text nearby rather than in full.",
                "The Android and iOS apps follow each system’s accessibility features, and may differ from the website.",
              ].map((x) => (
                <li key={x} className="flex gap-3">
                  <FA icon={faCheck} className="mt-1.5 shrink-0 text-[12px] text-green-fg" />
                  {x}
                </li>
              ))}
            </ul>
          </Surface>
        </div>
      </Section>

      <Section tight>
        <Reveal>
          <Surface variant="soft" className="mx-auto flex max-w-[920px] flex-col gap-3 p-6 sm:p-8">
            <h3 className="font-serif text-[24px] font-semibold tracking-[-0.02em]">Found a barrier? Tell us.</h3>
            <p className="text-[15px] leading-relaxed text-fg-muted">
              Email{" "}
              <a className="text-green-fg underline underline-offset-2" href={`mailto:${OPERATOR.email}?subject=Accessibility`}>
                {OPERATOR.email}
              </a>{" "}
              with the page or screen, what you were trying to do, and the device, browser or assistive technology you use. We reply within 3 working days and tell
              you what we will do.
            </p>
            <p className="text-[13px] text-fg-subtle">Last updated {LEGAL_UPDATED}.</p>
          </Surface>
        </Reveal>
      </Section>

      <CtaPanel title="Help us make it" quiet="better." lead="Your report goes straight to the people who build Naazhi." primary={["Contact us", "/contact"]} />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { faAt, faEye, faHandPointer } from "@fortawesome/free-solid-svg-icons";
import JsonLd from "../../components/site/JsonLd";
import { FaqList } from "../../components/site/Faq";
import { faqSlug } from "../../components/site/faqGroups";
import { ALL_INTEGRATIONS, FAQS, GROUPS } from "../../components/site/content";
import { CtaPanel, FeatureCards, PageHero } from "../../components/site/kit";
import { Logo } from "../../components/site/Logo";
import NoteRef from "../../components/site/NoteRef";
import Phone from "../../components/site/Phone";
import { R, Reveal } from "../../components/site/Reveal";
import { buttonClass, Section, SectionHead, StatusChip, Surface } from "../../components/site/ui";
import AuthLink from "../../components/auth/AuthLink";
import { RELEASES } from "../../features/changelog/releases";
import { isLive } from "../../lib/logos";
import { faqSchema, howToSchema, itemListSchema, pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "Integrations",
  title: "Integrations — Naazhi",
  description:
    "Connect Google and Zoho apps to your workspace and ask about them from chat. See which integrations are live today and which are still coming.",
  path: "/integrations",
};
export const metadata: Metadata = pageMeta({ ...SEO, ownImage: true });

// The two questions on this page are the FAQ's own answers, picked by question so there is one copy of each.
const QUESTIONS = ["Which email and calendar services will connect?", "Does it connect to the tools my team already uses?"];
const FAQ = FAQS.filter(([q]) => QUESTIONS.includes(q));

const LIVE = ALL_INTEGRATIONS.filter(isLive).length;

const STEPS = [
  { icon: faAt, t: "Type @ and pick an app", d: "In chat, type @ and choose a connected app, like Zoho Books." },
  {
    icon: faEye,
    t: "See what it is doing",
    d: "Chat shows what it is doing and reads your real records, so the answer comes from your own data.",
  },
  {
    icon: faHandPointer,
    t: "You press Create",
    d: "Anything it drafts waits for you to press Create. Nothing is added to your apps without you.",
  },
] as const;

export default function Page() {
  return (
    <main>
      <JsonLd
        data={[
          ...pageSchemas({ ...SEO, image: "/integrations/opengraph-image", about: "Naazhi integrations", dateModified: RELEASES[0]?.date }),
          itemListSchema({
            name: "Apps that connect to Naazhi",
            path: SEO.path,
            items: ALL_INTEGRATIONS.filter(isLive).map((name) => ({ name })),
          }),
          howToSchema({
            name: "How to ask a connected app from Naazhi chat",
            description: SEO.description,
            path: SEO.path,
            steps: STEPS.map((s) => ({ name: s.t, text: s.d })),
          }),
          faqSchema(FAQ, {
            path: SEO.path,
            name: SEO.title,
            description: SEO.description,
            dateModified: RELEASES[0]?.date,
            anchor: faqSlug,
          }),
        ]}
      />
      <PageHero
        eyebrow="Integrations"
        status={<StatusChip status="live" />}
        title="Bring your other apps"
        quiet="into the workspace."
        lead={`Connect the tools you already use and ask about them from chat. ${LIVE} are live today, and the rest are marked so you always know.`}
      >
        <AuthLink arrow className={buttonClass("primary")} />
        <a href="#all" className={buttonClass("secondary")}>
          See every app
        </a>
      </PageHero>

      <Section tight>
        <div className="mx-auto grid max-w-5xl items-center gap-[clamp(28px,5vw,72px)] md:grid-cols-[1.1fr_0.9fr]">
          <Reveal stagger={0.08} className="flex flex-col gap-4">
            <R>
              <p className="m-0 text-[12.5px] font-semibold tracking-[0.1em] text-green-fg uppercase">In chat</p>
            </R>
            <R>
              <h2 className="m-0 font-serif text-[clamp(30px,3.6vw,46px)] leading-[1.06] font-semibold tracking-[-0.03em] text-balance">
                Ask your apps, <span className="text-fg-faint">in plain words.</span>
              </h2>
            </R>
            <R>
              <p className="m-0 text-[17px] leading-relaxed text-fg-muted">
                Ask for your latest invoices, and the answer comes back in the conversation, with the source named. Connected apps are read
                when you ask.
              </p>
            </R>
          </Reveal>
          <Reveal>
            <div className="mx-auto w-[min(300px,72%)]">
              <Phone src="/mobile/connect.png" alt="Asking Zoho Books for invoices in Naazhi chat" className="w-full" />
            </div>
          </Reveal>
        </div>
        <FeatureCards items={STEPS} cols={3} />
      </Section>

      <Section id="all" tight band="soft">
        <SectionHead
          kicker="Every app"
          title="What connects,"
          quiet="and what’s coming."
          lead="Each one says whether it is live. Live apps come first in each group."
        />
        <Reveal stagger={0.08} className="mt-[clamp(28px,4vw,48px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((g) => (
            <R key={g.name}>
              <Surface className="h-full p-6">
                <h3 className="m-0 text-[12px] font-semibold tracking-[0.1em] text-fg-faint uppercase">{g.name}</h3>
                <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
                  {[...g.items]
                    .sort((a, b) => Number(isLive(b.name)) - Number(isLive(a.name)))
                    .map((x) => (
                      <li key={x.name} className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-r2 bg-surface-muted">
                          <Logo name={x.name} size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <b className="block text-[15px] font-medium text-fg">{x.name}</b>
                          <small className="block text-[13px] text-fg-muted">{x.use}</small>
                        </span>
                        <StatusChip status={isLive(x.name) ? "live" : "soon"} />
                      </li>
                    ))}
                </ul>
              </Surface>
            </R>
          ))}
        </Reveal>
        <p className="mx-auto mt-8 max-w-[640px] text-center text-[13px] leading-relaxed text-fg-faint">
          Names and logos belong to their owners.
          <NoteRef n={1} /> Apps marked Soon are not available yet.
          <NoteRef n={2} />
        </p>
      </Section>

      <Section tight>
        <div className="mx-auto grid max-w-5xl items-start gap-[clamp(24px,5vw,64px)] lg:grid-cols-[0.7fr_1.3fr]">
          <Reveal className="flex flex-col gap-2 lg:sticky lg:top-28">
            <h2 className="m-0 font-serif text-[clamp(28px,3.4vw,40px)] leading-[1.08] font-semibold tracking-[-0.025em]">Questions</h2>
            <p className="m-0 text-[16px] leading-relaxed text-fg-muted">
              More answers are on the{" "}
              <Link href="/faq" className="text-green-fg underline underline-offset-4">
                FAQ page
              </Link>
              .
            </p>
          </Reveal>
          <div>
            <FaqList items={FAQ} anchor={faqSlug} />
          </div>
        </div>
      </Section>

      <CtaPanel
        title="Connect your"
        quiet="first app."
        lead="Free to start. Connect an app when you are ready, and ask about it from chat."
        secondary={["See pricing", "/pricing"]}
        phone="/mobile/connect.png"
      />
    </main>
  );
}

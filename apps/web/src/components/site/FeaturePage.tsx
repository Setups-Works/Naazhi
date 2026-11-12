import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { FEATURE_BLURB, FEATURE_PAGES, type FeaturePageData } from "../../lib/featurePages";
import { RELEASES } from "../../features/changelog/releases";
import { faqSchema, itemListSchema, pageSchemas } from "../../lib/seo";
import { SHORTCUTS } from "./content";
import { FaqList } from "./Faq";
import { faqSlug } from "./faqGroups";
import JsonLd from "./JsonLd";
import { CtaPanel, FeatureCards, PageHero } from "./kit";
import Phone, { PhoneRow } from "./Phone";
import { R, Reveal } from "./Reveal";
import { buttonClass, Kbd, Section, SectionHead, StatusChip, Surface } from "./ui";
import AuthLink from "../auth/AuthLink";

/**
 * One feature page (Notes, Tasks, Journal), drawn from its data in lib/featurePages.ts: a hero with three phones, what you get, two
 * sections of text beside a screen, the keyboard shortcuts if there are any, questions and answers, and the other pages.
 */
export default function FeaturePage({ data }: { data: FeaturePageData }) {
  const seo = {
    name: data.name,
    title: data.seo.title,
    description: data.seo.description,
    path: data.path,
    image: `${data.path}/opengraph-image`,
    about: `Naazhi ${data.name}`,
    dateModified: RELEASES[0]?.date,
  };
  const shortcuts = data.shortcutGroup ? SHORTCUTS.filter((s) => s.group === data.shortcutGroup) : [];
  return (
    <main>
      <JsonLd
        data={[
          ...pageSchemas(seo),
          itemListSchema({
            name: `What ${data.name} does in Naazhi`,
            path: data.path,
            items: data.points.map((p) => ({ name: p.t, description: p.d })),
          }),
          faqSchema(data.faq, {
            path: data.path,
            name: data.seo.title,
            description: data.seo.description,
            dateModified: RELEASES[0]?.date,
            anchor: faqSlug,
          }),
        ]}
      />
      <PageHero
        eyebrow={data.name}
        status={<StatusChip status="live" />}
        title={data.hero.title}
        quiet={data.hero.quiet}
        lead={data.hero.lead}
        visual={<PhoneRow screens={data.hero.screens} />}
      >
        <AuthLink arrow className={buttonClass("primary")} />
        <Link href="/how-it-works" className={buttonClass("secondary")}>
          How it works
        </Link>
      </PageHero>

      <Section tight>
        <SectionHead kicker="What you get" title={`${data.name}, done`} quiet="properly." />
        <FeatureCards items={data.points} cols={data.points.length === 4 ? 2 : 3} />
      </Section>

      {data.showcase.map((s, i) => (
        <Section key={s.kicker} tight band={i % 2 === 0 ? "soft" : "plain"}>
          <div className="mx-auto grid max-w-5xl items-center gap-[clamp(28px,5vw,72px)] md:grid-cols-2">
            <Reveal stagger={0.08} className={`flex flex-col gap-4 ${i % 2 ? "md:order-2" : ""}`}>
              <R>
                <p className="m-0 text-[12.5px] font-semibold tracking-[0.1em] text-green-fg uppercase">{s.kicker}</p>
              </R>
              <R>
                <h2 className="m-0 font-serif text-[clamp(30px,3.6vw,46px)] leading-[1.06] font-semibold tracking-[-0.03em] text-balance">
                  {s.title} <span className="text-fg-faint">{s.quiet}</span>
                </h2>
              </R>
              <R>
                <p className="m-0 text-[17px] leading-relaxed text-fg-muted">{s.lead}</p>
              </R>
              <R>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-[15.5px] text-fg">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-green-bg text-[11px] text-green-fg">
                        <FA icon={faCheck} />
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </R>
            </Reveal>
            <Reveal className={i % 2 ? "md:order-1" : ""}>
              <div className="mx-auto w-[min(300px,72%)]">
                <Phone src={s.shot.src} alt={s.shot.alt} className="w-full" />
              </div>
            </Reveal>
          </div>
        </Section>
      ))}

      {shortcuts.length > 0 && (
        <Section tight>
          <SectionHead
            kicker="Keyboard first"
            title="Never reach for"
            quiet="the mouse."
            lead="Shortcuts work anywhere in the app, except while you are typing in a box."
          />
          <Reveal stagger={0.06} className="mx-auto mt-[clamp(24px,4vw,44px)] grid max-w-3xl gap-3 sm:grid-cols-2">
            {shortcuts.map((k) => (
              <R key={k.label}>
                <Surface radius="r3" className="flex items-center justify-between gap-4 px-5 py-4">
                  <span className="text-[15.5px] text-fg">{k.label}</span>
                  <span className="flex gap-1.5">
                    {k.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </span>
                </Surface>
              </R>
            ))}
          </Reveal>
        </Section>
      )}

      <Section tight band={data.showcase.length % 2 === 0 ? "plain" : "soft"}>
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
            <FaqList items={data.faq} anchor={faqSlug} />
          </div>
        </div>
      </Section>

      <Section tight>
        <SectionHead kicker="Keep exploring" title="The rest of" quiet="the workspace." />
        <Reveal stagger={0.08} className="mx-auto mt-[clamp(24px,4vw,44px)] grid max-w-4xl gap-4 sm:grid-cols-2">
          {data.related.map((slug) => {
            const p = FEATURE_PAGES[slug];
            const b = FEATURE_BLURB[slug];
            return (
              <R key={slug}>
                <Link href={p.path} className="block h-full">
                  <Surface lift className="flex h-full items-start gap-4 p-6">
                    <span className="grid size-11 shrink-0 place-items-center rounded-r2 bg-green-bg text-[17px] text-green-fg">
                      <FA icon={b.icon} />
                    </span>
                    <span>
                      <b className="block text-[17px] font-semibold text-fg">{p.name}</b>
                      <span className="mt-1 block text-[15px] leading-relaxed text-fg-muted">{b.d}</span>
                    </span>
                  </Surface>
                </Link>
              </R>
            );
          })}
        </Reveal>
      </Section>

      <CtaPanel
        title="Start with"
        quiet={`${data.name.toLowerCase()}.`}
        lead="Free to start, with AI only when you want it. Everything you write stays in your workspace."
        secondary={["See pricing", "/pricing"]}
        phone={data.hero.screens[0]}
      />
    </main>
  );
}

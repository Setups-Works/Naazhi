import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import { faBan, faBullseye, faCalendarDays, faCheck, faCodeBranch, faCommentDots, faEye, faFileExport, faLanguage, faLocationDot, faStar, faUserLock } from "@fortawesome/free-solid-svg-icons";
import { CAPABILITIES } from "../../components/site/content";
import JsonLd from "../../components/site/JsonLd";
import { CtaPanel, FeatureCards, PageHero, SectionHead } from "../../components/site/kit";
import { R, Reveal } from "../../components/site/Reveal";
import { buttonClass, Kicker, Section, StatusChip, Surface, TextLink } from "../../components/site/ui";
import { RELEASES } from "../../features/changelog/releases";
import { OPERATOR } from "../../lib/legal";
import { pageMeta, pageSchemas, SETUPS_WORKS } from "../../lib/seo";

const SEO = {
  name: "About",
  title: "About — Naazhi",
  description: `Why Naazhi exists, what its name means, what you can use today and what is still being built. One workspace, any AI, by ${OPERATOR.name}.`,
  path: "/about",
};
export const metadata: Metadata = pageMeta({ ...SEO, ownImage: true });

const NEXT = CAPABILITIES.filter((c) => c.status !== "live");
const RECENT = RELEASES.slice(0, 3);

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const HOW = [
  { t: "We say what works today", d: "Every feature on this site is marked Live, Building or Coming soon. A label changes only when the work does." },
  { t: "We write plainly", d: "Short sentences, no hype. When something goes wrong, we say what happened and what to do next." },
  { t: "We keep it small", d: "A calm tool does a few things well. We would rather finish a feature than announce three." },
  { t: "We listen to early users", d: "What people tell us in an ordinary week decides what we build next. Quotes are shared only with permission." },
] as const;

export default function Page() {
  return (
    <main>
      <JsonLd data={pageSchemas({ ...SEO, type: "AboutPage", mainEntity: "organization", dateModified: RELEASES[0]?.date })} />
      <PageHero
        eyebrow="About"
        title="One calm place for"
        quiet="your work."
        lead="Naazhi brings notes, tasks, journal, chat and calendar into one workspace, with an AI you can swap, bring your own, or switch off. Your AI can change. Your workspace shouldn’t."
      >
        <a className={buttonClass("primary")} href="/signup">
          Get started
        </a>
        <a className={buttonClass("secondary")} href="/how-it-works">
          How it works
        </a>
      </PageHero>

      <Section tight>
        <Reveal>
          <Surface variant="soft" radius="r5" className="mx-auto max-w-[900px] p-[clamp(24px,5vw,56px)]">
            <Kicker>Why Naazhi exists</Kicker>
            <p className="mt-4 font-serif text-[clamp(22px,3vw,32px)] leading-snug font-semibold tracking-[-0.02em] text-fg">
              Most of us keep our work in many places and let each AI tool keep its own copy. We think your notes, tasks and journal should live in one place you
              control, and that AI should be something you plug into it, not something that owns it.
            </p>
            <div className="mt-6 grid gap-5 text-[15.5px] leading-relaxed text-fg-muted md:grid-cols-2">
              <p>
                Switching tools usually means starting over: exporting, re-importing, losing the links between things. So people stay with a tool long after it stopped
                suiting them, or they scatter their work across five apps.
              </p>
              <p>
                Naazhi keeps what you write separate from the AI that helps you write it. Change the model, bring your own key or turn AI off, and nothing you have
                kept moves.
              </p>
            </div>
          </Surface>
        </Reveal>
      </Section>

      <Section id="mission" tight>
        <SectionHead kicker="Mission and vision" title="What we are here" quiet="to do." />
        <Reveal stagger={0.1} className="mt-[clamp(28px,4vw,52px)] grid gap-4 md:grid-cols-2">
          <R>
            <Surface variant="soft" radius="r5" className="flex h-full flex-col gap-4 p-[clamp(24px,4vw,44px)]">
              <span className="grid size-12 place-items-center rounded-r3 bg-green-bg text-green-fg">
                <FA icon={faBullseye} className="text-[18px]" />
              </span>
              <p className="text-[12px] font-semibold tracking-[0.1em] text-green-fg uppercase">Our mission</p>
              <p className="font-serif text-[clamp(22px,2.6vw,30px)] leading-snug font-semibold tracking-[-0.02em] text-fg">
                To give everyone one calm, private place for their notes, tasks and days, with AI that helps only when they ask for it.
              </p>
              <p className="text-[15px] leading-relaxed text-fg-muted">We do this by keeping what you write separate from the AI, saying plainly what we do, and never locking you in.</p>
            </Surface>
          </R>
          <R>
            <Surface radius="r5" className="flex h-full flex-col gap-4 p-[clamp(24px,4vw,44px)]">
              <span className="grid size-12 place-items-center rounded-r3 bg-violet-bg text-violet-fg">
                <FA icon={faEye} className="text-[18px]" />
              </span>
              <p className="text-[12px] font-semibold tracking-[0.1em] text-violet-fg uppercase">Our vision</p>
              <p className="font-serif text-[clamp(22px,2.6vw,30px)] leading-snug font-semibold tracking-[-0.02em] text-fg">
                A world where your work and thoughts belong to you, outlast any tool, and work with whichever AI you choose.
              </p>
              <p className="text-[15px] leading-relaxed text-fg-muted">Software that stays out of the way, so the days and ideas you keep are the part that lasts.</p>
            </Surface>
          </R>
        </Reveal>
      </Section>

      <Section tight>
        <Reveal>
          <Surface className="mx-auto grid max-w-[900px] items-center gap-8 p-[clamp(24px,5vw,56px)] md:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-3 md:items-start">
              <Image
                src="/brand/naazhi-tamil.png"
                alt="நாழி, Naazhi written in Tamil"
                width={1408}
                height={621}
                sizes="(min-width: 768px) 280px, 70vw"
                lang="ta"
                className="h-auto w-[min(280px,70vw)]"
              />
              <span className="rounded-pill bg-green-bg px-3.5 py-1 text-[13px] font-medium text-green-fg">NAA-zhee</span>
            </div>
            <div className="flex flex-col gap-3">
              <Kicker>The name</Kicker>
              <h2 className="font-serif text-[clamp(26px,3.4vw,38px)] leading-tight font-semibold tracking-[-0.02em]">A small, honest unit you use every day.</h2>
              <p className="text-[15.5px] leading-relaxed text-fg-muted">
                Naazhi (நாழி) is an old Tamil measure, of grain and of time. It is a unit small enough to use daily and plain enough to trust. That is what we want the
                product to be: it keeps the days, work and thoughts of one person in one place.
              </p>
              <p className="flex items-start gap-2.5 text-[14px] leading-relaxed text-fg-subtle">
                <FA icon={faLanguage} className="mt-1 shrink-0 text-[13px]" />
                Say it with a long “aa”, then the Tamil ழ, a sound between “l”, “r” and “zh”.
              </p>
            </div>
          </Surface>
        </Reveal>
      </Section>

      <Section tight>
        <SectionHead kicker="What we believe" title="Four" quiet="commitments." />
        <FeatureCards
          cols={2}
          items={[
            { icon: faCodeBranch, t: "Your workspace outlasts any AI", d: "Switch models or providers and nothing moves. Your content stays where it is.", tone: "green" },
            { icon: faBan, t: "AI is optional", d: "Use it when it helps, bring your own key, or keep the workspace fully AI-free.", tone: "clay" },
            { icon: faUserLock, t: "Private by default", d: "Your journal is private to you, and we explain in plain words who can see what.", tone: "violet" },
            { icon: faFileExport, t: "You can leave", d: "Import and export are built in, so you are never locked in.", tone: "mint" },
          ]}
        />
        <p className="mt-6 text-center text-[14px] text-fg-subtle">
          The detail is on <TextLink href="/privacy-security">Privacy &amp; Security</TextLink>.
        </p>
      </Section>

      {NEXT.length > 0 && (
        <Section tight>
          <SectionHead
            kicker="Still to come"
            title="Being built,"
            quiet="honestly labelled."
            lead="These are not available yet. We list them so you know where Naazhi is going, and we change the label only when it ships."
          />
          <p className="mt-4 text-center text-[14px]">
            <TextLink href="/roadmap">See the full roadmap</TextLink>
          </p>
          <Reveal className="mt-[clamp(28px,4vw,48px)]">
            <Surface className="mx-auto max-w-[820px] overflow-hidden">
              <ul className="divide-y divide-line">
                {NEXT.map((c) => (
                  <li key={c.t} className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
                    <div>
                      <p className="text-[15.5px] font-medium text-fg">{c.t}</p>
                      <p className="mt-0.5 text-[14px] leading-relaxed text-fg-muted">{c.d}</p>
                    </div>
                    <StatusChip status={c.status} />
                  </li>
                ))}
              </ul>
            </Surface>
          </Reveal>
        </Section>
      )}

      <Section tight>
        <SectionHead kicker="How we work" title="Small habits," quiet="kept." />
        <Reveal stagger={0.08} className="mt-[clamp(28px,4vw,48px)] grid gap-4 sm:grid-cols-2">
          {HOW.map((h) => (
            <R key={h.t}>
              <Surface lift className="flex h-full gap-4 p-6">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-green-bg text-green-fg">
                  <FA icon={faCheck} className="text-[13px]" />
                </span>
                <div>
                  <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-fg">{h.t}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">{h.d}</p>
                </div>
              </Surface>
            </R>
          ))}
        </Reveal>
      </Section>

      <Section tight>
        <Reveal>
          <Surface className="mx-auto grid max-w-[900px] items-center gap-8 p-[clamp(24px,5vw,56px)] md:grid-cols-[auto_1fr]">
            <Image src="/brand/naazhi-mark.png" alt="The Naazhi mark" width={160} height={160} className="mx-auto size-28 object-contain md:size-36" />
            <div className="flex flex-col gap-3">
              <Kicker>The mark</Kicker>
              <h2 className="font-serif text-[clamp(26px,3.4vw,38px)] leading-tight font-semibold tracking-[-0.02em]">Drawn by hand, in one weight.</h2>
              <p className="text-[15.5px] leading-relaxed text-fg-muted">
                The mark is a single-weight monogram built from rounded Tamil-script curves: a small curl, a loop, and a long tail that closes into a speech bubble.
              </p>
              <ul className="flex flex-col gap-2 text-[15px] text-fg-muted">
                <li className="flex items-start gap-2.5">
                  <FA icon={faCommentDots} className="mt-1.5 shrink-0 text-[13px] text-green-fg" />
                  The bubble with three lines stands for what you write: notes, journal and chat.
                </li>
                <li className="flex items-start gap-2.5">
                  <FA icon={faStar} className="mt-1.5 shrink-0 text-[13px] text-green-fg" />
                  The small star is the AI layer: present, small, optional.
                </li>
              </ul>
            </div>
          </Surface>
        </Reveal>
      </Section>

      <Section tight>
        <SectionHead kicker="Recently" title="What we" quiet="shipped lately." />
        <Reveal className="mt-[clamp(28px,4vw,48px)]">
          <Surface className="mx-auto max-w-[820px] overflow-hidden">
            <ul className="divide-y divide-line">
              {RECENT.map((r) => (
                <li key={`${r.date}-${r.title}`} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:gap-6 sm:px-6">
                  <time dateTime={r.date} className="shrink-0 text-[13px] text-fg-subtle sm:w-40">
                    {dayLabel(r.date)}
                  </time>
                  <div>
                    <p className="text-[15.5px] font-medium text-fg">{r.title}</p>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-fg-muted">{r.summary}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Surface>
          <p className="mx-auto mt-4 max-w-[820px] text-[14px] text-fg-subtle">
            The whole history is in the <TextLink href="/changelog">changelog</TextLink>.
          </p>
        </Reveal>
      </Section>

      <Section id="setups-works" tight>
        <SectionHead
          kicker="About Setups Works"
          title="The company"
          quiet="behind Naazhi."
          lead={`Naazhi is a software product built and run by ${OPERATOR.name}, a technology company in Tamil Nadu, India.`}
        />
        <Reveal stagger={0.08} className="mx-auto mt-[clamp(28px,4vw,48px)] grid max-w-[900px] gap-4 sm:grid-cols-2">
          {[
            { icon: faCalendarDays, k: "Founded", v: "2020" },
            { icon: faLocationDot, k: "Based in", v: `${SETUPS_WORKS.address.locality}, ${SETUPS_WORKS.address.region}` },
          ].map((f) => (
            <R key={f.k}>
              <Surface className="flex h-full flex-col gap-2 p-5">
                <span className="grid size-10 place-items-center rounded-r3 bg-green-bg text-green-fg">
                  <FA icon={f.icon} className="text-[15px]" />
                </span>
                <p className="mt-1 text-[12px] font-semibold tracking-[0.08em] text-fg-faint uppercase">{f.k}</p>
                <p className="text-[15.5px] leading-snug font-medium text-fg">{f.v}</p>
              </Surface>
            </R>
          ))}
        </Reveal>

        <p className="mt-[clamp(20px,3vw,32px)] text-center text-[14px] text-fg-subtle">
          Meet the people on the <TextLink href="/team">Team page</TextLink>, or <TextLink href="/contact">get in touch</TextLink>.
        </p>
      </Section>

      <CtaPanel title="Try it with" quiet="your own work." lead="Start with notes and tasks. Add AI later, or never." phone="/mobile/home-2.png" />
    </main>
  );
}

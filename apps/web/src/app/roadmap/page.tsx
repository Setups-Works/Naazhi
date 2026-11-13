import type { Metadata } from "next";
import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck, faCommentDots, faEye, faListOl, faTabletScreenButton, faVoteYea } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { CAPABILITIES } from "../../components/site/content";
import JsonLd from "../../components/site/JsonLd";
import { CtaPanel, FeatureCards, PageHero, SectionHead } from "../../components/site/kit";
import { R, Reveal } from "../../components/site/Reveal";
import { buttonClass, IconBadge, Section, StatusChip, Surface, TextLink, type Status } from "../../components/site/ui";
import { RELEASES } from "../../features/changelog/releases";
import { itemListSchema, pageMeta, pageSchemas } from "../../lib/seo";

const SEO = {
  name: "Roadmap",
  title: "Roadmap — Naazhi",
  description: "What Naazhi is building now, what is planned next, and what shipped lately. Honest labels, no dates we can’t keep.",
  path: "/roadmap",
};
export const metadata: Metadata = pageMeta({ ...SEO, ownImage: true });

type Item = { icon: IconDefinition; t: string; d: string; status: Status };

/**
 * The roadmap is the capability list in content.ts (its `status` is the single source of truth, kept honest by a test), plus the
 * iPhone and iPad app, which isn't a capability. Move an item between columns by changing its status there, not here.
 */
const EXTRA: Item[] = [
  { icon: faTabletScreenButton, t: "iPhone and iPad app", d: "The same workspace on the App Store, in sync with the web and Android.", status: "soon" },
];
const ITEMS: Item[] = [...CAPABILITIES.filter((c) => c.status !== "live").map((c) => ({ icon: c.icon, t: c.t, d: c.d, status: c.status })), ...EXTRA];
const BUILDING = ITEMS.filter((i) => i.status === "building");
const PLANNED = ITEMS.filter((i) => i.status === "soon");
const SHIPPED = RELEASES.slice(0, 5);

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function Column({ title, hint, status, items, empty }: { title: string; hint: string; status: Status; items: Item[]; empty: string }) {
  return (
    <Surface className="flex h-full flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif text-[24px] font-semibold tracking-[-0.02em]">{title}</h3>
        <StatusChip status={status} />
      </div>
      <p className="text-[13.5px] leading-relaxed text-fg-subtle">{hint}</p>
      {items.length === 0 ? (
        <p className="rounded-r3 bg-surface-sunken px-4 py-5 text-[14px] text-fg-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((i) => (
            <li key={i.t} className="flex gap-3.5 rounded-r3 bg-surface-muted/60 p-4 ring-1 ring-line">
              <IconBadge icon={i.icon} className="size-10 shrink-0" />
              <div>
                <p className="text-[15.5px] font-medium text-fg">{i.t}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-fg-muted">{i.d}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

export default function Page() {
  return (
    <main>
      <JsonLd
        data={[
          ...pageSchemas({ ...SEO, type: "CollectionPage", dateModified: RELEASES[0]?.date }),
          itemListSchema({ name: "Naazhi roadmap: building and planned", path: "/roadmap", items: [...BUILDING, ...PLANNED].map((i) => ({ name: i.t, description: `${i.status === "building" ? "In development" : "Planned"}: ${i.d}` })) }),
        ]}
      />
      <PageHero
        eyebrow="Roadmap"
        title="Where Naazhi is"
        quiet="going."
        lead="What we are building now, what comes next, and what has shipped. We label each thing honestly, and we don’t promise dates we can’t keep."
      >
        <a className={buttonClass("primary")} href="#board">
          See the roadmap
        </a>
        <Link className={buttonClass("secondary")} href="/changelog">
          Read the changelog
        </Link>
      </PageHero>

      <Section id="board" tight>
        <SectionHead
          kicker="The board"
          title="Now, next"
          quiet="and done."
          lead="An item moves from planned to building to live only when the work does. Order within a column is not a ranking."
        />
        <Reveal stagger={0.1} className="mt-[clamp(28px,4vw,52px)] grid gap-4 lg:grid-cols-3">
          <R>
            <Column title="Building" status="building" hint="In development now." items={BUILDING} empty="Nothing in development at this moment." />
          </R>
          <R>
            <Column title="Planned" status="soon" hint="On the list. Not started, and not available yet." items={PLANNED} empty="Nothing planned right now." />
          </R>
          <R>
            <Surface className="flex h-full flex-col gap-4 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-serif text-[24px] font-semibold tracking-[-0.02em]">Shipped</h3>
                <StatusChip status="live" />
              </div>
              <p className="text-[13.5px] leading-relaxed text-fg-subtle">The latest releases you can use today.</p>
              <ul className="flex flex-col gap-3">
                {SHIPPED.map((r) => (
                  <li key={`${r.date}-${r.title}`} className="flex gap-3.5 rounded-r3 bg-surface-muted/60 p-4 ring-1 ring-line">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-green-bg text-green-fg">
                      <FA icon={faCheck} className="text-[11px]" />
                    </span>
                    <div>
                      <p className="text-[15.5px] font-medium text-fg">{r.title}</p>
                      <time dateTime={r.date} className="mt-0.5 block text-[12.5px] text-fg-subtle">
                        {dayLabel(r.date)}
                      </time>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-auto text-[14px]">
                <TextLink href="/changelog">Full changelog</TextLink>
              </p>
            </Surface>
          </R>
        </Reveal>
      </Section>

      <Section tight>
        <SectionHead kicker="How we decide" title="What gets built," quiet="and when." />
        <FeatureCards
          items={[
            { icon: faCommentDots, t: "People tell us", d: "What early users say in an ordinary week matters most. We read every message.", tone: "green" },
            { icon: faListOl, t: "Finish before starting", d: "We would rather ship one thing well than announce three. Items stay in Building until they work.", tone: "blue" },
            { icon: faEye, t: "Labels stay honest", d: "A feature is marked Live only when you can use it today. We change labels when the work changes.", tone: "violet" },
          ]}
        />
        <p className="mx-auto mt-6 max-w-[760px] text-center text-[14px] leading-relaxed text-fg-subtle">
          This roadmap is a plan, not a promise. Priorities can change, and an item can move, be reshaped or be dropped. See the notes at the foot of the page.
        </p>
      </Section>

      <Section tight>
        <Reveal>
          <Surface variant="soft" radius="r5" className="mx-auto flex max-w-[900px] flex-col gap-4 p-[clamp(24px,5vw,56px)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-r3 bg-green-bg text-green-fg">
                <FA icon={faVoteYea} className="text-[18px]" />
              </span>
              <div>
                <h2 className="font-serif text-[clamp(24px,3vw,32px)] leading-tight font-semibold tracking-[-0.02em]">Missing something you need?</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">Tell us what you tried to do and couldn’t. That is how this list changes.</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link className={buttonClass("primary")} href="/feature-requests">
                Request a feature
              </Link>
              <Link className={buttonClass("secondary")} href="/early-users">
                Become an early user
              </Link>
            </div>
          </Surface>
        </Reveal>
      </Section>

      <CtaPanel title="Use what’s live," quiet="today." lead="Notes, tasks, journal, chat and calendar are ready now. The rest will arrive marked live." phone="/mobile/home-2.png" />
    </main>
  );
}

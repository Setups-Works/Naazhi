import Link from "next/link";
import { faCheck, faMinus } from "@fortawesome/free-solid-svg-icons";
import { Icon as FA } from "@/components/ui/Icon";
import AuthLink from "../auth/AuthLink";
import JsonLd from "./JsonLd";
import { FaqList } from "./Faq";
import { faqSlug } from "./faqGroups";
import { CtaPanel, PageHero } from "./kit";
import { R, Reveal } from "./Reveal";
import { buttonClass, Section, SectionHead, Surface } from "./ui";
import { COMPARED_ON_ISO, COMPARISONS, COMPARISON_ORDER, type Comparison } from "../../lib/comparisons";
import { faqSchema, pageSchemas } from "../../lib/seo";

const day = new Date(`${COMPARED_ON_ISO}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const List = ({ items, tick }: { items: string[]; tick?: boolean }) => (
  <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
    {items.map((x) => (
      <li key={x} className="flex gap-3 text-[15px] leading-relaxed text-fg-muted">
        <FA icon={tick ? faCheck : faMinus} className={`mt-1.5 shrink-0 text-[12px] ${tick ? "text-green-fg" : "text-fg-subtle"}`} />
        {x}
      </li>
    ))}
  </ul>
);

/** "Naazhi vs <product>": one summary each, a row-by-row table, who should pick which, what Naazhi doesn't do, and questions. Data in lib/comparisons.ts. */
export default function ComparePage({ c }: { c: Comparison }) {
  const SEO = { name: `Naazhi vs ${c.other}`, title: c.seo.title, description: c.seo.description, path: c.path };
  const others = COMPARISON_ORDER.filter((s) => s !== c.slug).map((s) => COMPARISONS[s]);
  return (
    <main>
      <JsonLd
        data={[
          ...pageSchemas({ ...SEO, image: `${c.path}/opengraph-image`, about: `Naazhi compared with ${c.other}`, dateModified: COMPARED_ON_ISO }),
          faqSchema(c.faqs, { path: c.path, name: SEO.title, description: SEO.description, dateModified: COMPARED_ON_ISO, anchor: faqSlug }),
        ]}
      />
      <PageHero eyebrow="Compare" title={c.hero.title} quiet={c.hero.quiet} lead={c.hero.lead}>
        <AuthLink arrow className={buttonClass("primary")} />
        <a href="#table" className={buttonClass("secondary")}>
          See the table
        </a>
      </PageHero>

      <Section tight>
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          <Surface className="flex flex-col gap-2 p-6">
            <h2 className="m-0 text-[13px] font-semibold tracking-[0.1em] text-fg-faint uppercase">{c.other}</h2>
            <p className="m-0 text-[16px] leading-relaxed text-fg-muted">{c.summary.other}</p>
          </Surface>
          <Surface variant="soft" className="flex flex-col gap-2 p-6">
            <h2 className="m-0 text-[13px] font-semibold tracking-[0.1em] text-green-fg uppercase">Naazhi</h2>
            <p className="m-0 text-[16px] leading-relaxed text-fg-muted">{c.summary.naazhi}</p>
          </Surface>
        </div>
      </Section>

      <Section id="table" tight band="soft">
        <SectionHead kicker="Side by side" title="What each one" quiet="does." lead={`Checked on ${day} against each product’s public pages. If something is out of date, tell us on the contact page.`} />
        <Reveal className="mx-auto mt-[clamp(28px,4vw,48px)] max-w-5xl overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <caption className="sr-only">{`Naazhi compared with ${c.other}`}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="w-[18%] py-3 pr-4 text-[12.5px] font-semibold text-fg-subtle" />
                <th scope="col" className="w-[41%] py-3 pr-4 text-[15px] font-semibold text-green-fg">
                  Naazhi
                </th>
                <th scope="col" className="w-[41%] py-3 text-[15px] font-semibold text-fg">
                  {c.other}
                </th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.label} className="border-b border-line align-top">
                  <th scope="row" className="py-4 pr-4 text-[14px] font-semibold text-fg">
                    {r.label}
                  </th>
                  <td className="py-4 pr-4 text-[14.5px] leading-relaxed text-fg-muted">{r.naazhi}</td>
                  <td className="py-4 text-[14.5px] leading-relaxed text-fg-muted">{r.other}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </Section>

      <Section tight>
        <SectionHead kicker="Which one" title="Pick the one" quiet="that fits." />
        <Reveal stagger={0.08} className="mx-auto mt-[clamp(28px,4vw,48px)] grid max-w-5xl gap-4 md:grid-cols-2">
          <R>
            <Surface className="h-full p-6">
              <h3 className="m-0 mb-4 text-[18px] font-semibold tracking-[-0.01em]">{`Choose ${c.other} if…`}</h3>
              <List items={c.chooseOther} tick />
            </Surface>
          </R>
          <R>
            <Surface variant="soft" className="h-full p-6">
              <h3 className="m-0 mb-4 text-[18px] font-semibold tracking-[-0.01em]">Choose Naazhi if…</h3>
              <List items={c.chooseNaazhi} tick />
            </Surface>
          </R>
        </Reveal>
        <div className="mx-auto mt-4 max-w-5xl">
          <Surface className="p-6">
            <h3 className="m-0 mb-4 text-[18px] font-semibold tracking-[-0.01em]">What Naazhi doesn’t do (yet)</h3>
            <List items={c.gaps} />
            <p className="m-0 mt-4 text-[13.5px] text-fg-subtle">
              Planned items are on the{" "}
              <Link href="/roadmap" className="text-green-fg underline underline-offset-4">
                roadmap
              </Link>
              . We mark a feature live only when you can use it.
            </p>
          </Surface>
        </div>
      </Section>

      <Section tight band="soft">
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
            <FaqList items={c.faqs} anchor={faqSlug} />
          </div>
        </div>
      </Section>

      <Section tight>
        <p className="mx-auto m-0 max-w-5xl text-center text-[14.5px] text-fg-muted">
          Also compare:{" "}
          {others.map((o) => (
            <Link key={o.slug} href={o.path} className="text-green-fg underline underline-offset-4">
              {`Naazhi vs ${o.other}`}
            </Link>
          ))}
          . Names belong to their owners.
        </p>
      </Section>

      <CtaPanel title="Try Naazhi" quiet="free." lead="Free to start. Bring your notes over, and keep using what works for you." secondary={["See integrations", "/integrations"]} />
    </main>
  );
}

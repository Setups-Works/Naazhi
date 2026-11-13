import type { Metadata } from "next";
import Link from "next/link";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowRight, faEnvelope, faLightbulb, faSignal } from "@fortawesome/free-solid-svg-icons";
import HelpSearch from "../../components/help/HelpSearch";
import JsonLd from "../../components/site/JsonLd";
import { CtaPanel } from "../../components/site/kit";
import { R, Reveal } from "../../components/site/Reveal";
import { Heading } from "../../components/site/Heading";
import { IconBadge, Kicker, Section, Surface, WRAP } from "../../components/site/ui";
import { ARTICLES, articlesIn, CATEGORIES, categoryBySlug } from "../../features/help/articles";
import { HELP_DESCRIPTION, HELP_NAME, helpCollectionSchema, helpMeta } from "../../features/help/seo";
import { helpHref, siteHref } from "../../lib/hosts";

export const metadata: Metadata = helpMeta({ title: "Naazhi Help — answers, guides and troubleshooting", description: HELP_DESCRIPTION, path: "/" });

const POPULAR = ARTICLES.filter((a) => a.popular);
const SUGGESTED = ["reset password", "install android", "cancel plan", "own key", "slash commands", "delete account"];

export default function Page() {
  return (
    <main>
      <JsonLd
        data={helpCollectionSchema({
          name: HELP_NAME,
          description: HELP_DESCRIPTION,
          path: "/",
          items: CATEGORIES.map((c) => ({ name: c.title, description: c.description, path: `/${c.slug}` })),
        })}
      />
      <section className="relative pt-[clamp(44px,7vw,96px)] pb-[clamp(36px,5vw,64px)] text-center">
        <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[360px] w-[min(1000px,120vw)] -translate-x-1/2 rounded-full bg-green-bg/70 blur-3xl" />
        <div className={`${WRAP} flex flex-col items-center`}>
          <Kicker>Help center</Kicker>
          <Heading as="h1" size="display" quiet="help?" immediate className="mt-3 max-w-[900px]">
            How can we
          </Heading>
          <p className="mx-auto mt-5 max-w-[560px] text-[clamp(17px,1.6vw,20px)] leading-relaxed text-fg-muted">
            Guides for notes, tasks, journal, chat and your account. Search, or pick a topic.
          </p>
          <div className="mt-8 w-full max-w-[640px]">
            <HelpSearch />
            <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[13.5px] text-fg-subtle">
              Try:
              {SUGGESTED.map((s) => (
                <Link key={s} href={`${helpHref("/search")}?q=${encodeURIComponent(s)}`} className="rounded-pill bg-surface-sunken px-3 py-1 text-fg-muted ring-1 ring-line transition-colors hover:text-fg">
                  {s}
                </Link>
              ))}
            </p>
          </div>
        </div>
      </section>

      <Section tight>
        <Reveal stagger={0.06} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <R key={c.slug}>
              <Link href={helpHref(`/${c.slug}`)} className="block h-full">
                <Surface lift className="flex h-full flex-col gap-3 p-6">
                  <IconBadge icon={c.icon} />
                  <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.01em] text-fg">{c.title}</h2>
                  <p className="text-[15px] leading-relaxed text-fg-muted">{c.description}</p>
                  <p className="mt-auto pt-2 text-[13px] text-fg-subtle">
                    {articlesIn(c.slug).length} {articlesIn(c.slug).length === 1 ? "article" : "articles"}
                  </p>
                </Surface>
              </Link>
            </R>
          ))}
        </Reveal>
      </Section>

      <Section tight band="soft">
        <div className="mx-auto max-w-[860px]">
          <h2 className="font-serif text-[clamp(28px,3.6vw,40px)] leading-tight font-semibold tracking-[-0.025em]">Popular articles</h2>
          <Reveal className="mt-6">
            <Surface className="overflow-hidden">
              <ul className="divide-y divide-line">
                {POPULAR.map((a) => (
                  <li key={a.slug}>
                    <Link href={helpHref(`/${a.category}/${a.slug}`)} className="group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-muted sm:px-6">
                      <span>
                        <span className="block text-[16px] font-medium text-fg">{a.title}</span>
                        <span className="mt-0.5 block text-[13.5px] text-fg-subtle">{categoryBySlug(a.category)?.title}</span>
                      </span>
                      <FA icon={faArrowRight} className="shrink-0 text-[13px] text-fg-faint transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Surface>
          </Reveal>
        </div>
      </Section>

      <Section tight>
        <Reveal stagger={0.08} className="mx-auto grid max-w-[980px] gap-4 md:grid-cols-3">
          {[
            { icon: faEnvelope, t: "Write to us", d: "A person replies within 3 working days.", href: siteHref("/contact"), cta: "Contact us" },
            { icon: faLightbulb, t: "Missing a feature?", d: "Tell us what you tried to do and couldn’t.", href: siteHref("/feature-requests"), cta: "Request a feature" },
            { icon: faSignal, t: "Is something down?", d: "Check whether Naazhi is working right now.", href: siteHref("/status"), cta: "See the status" },
          ].map((x) => (
            <R key={x.t}>
              <Surface className="flex h-full flex-col gap-3 p-6">
                <IconBadge icon={x.icon} />
                <h2 className="mt-1 text-[17px] font-semibold text-fg">{x.t}</h2>
                <p className="text-[15px] leading-relaxed text-fg-muted">{x.d}</p>
                <Link href={x.href} className="mt-auto pt-2 text-[14.5px] font-medium text-green-fg underline underline-offset-4">
                  {x.cta}
                </Link>
              </Surface>
            </R>
          ))}
        </Reveal>
      </Section>

      <CtaPanel title="New to" quiet="Naazhi?" lead="Start with notes and tasks. Add AI later, or never." primary={["Get started", "/signup"]} secondary={["How it works", siteHref("/how-it-works")]} />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import JsonLd from "../../../components/site/JsonLd";
import { Reveal } from "../../../components/site/Reveal";
import { IconBadge, Section, Surface, WRAP } from "../../../components/site/ui";
import { articlesIn, CATEGORIES, categoryBySlug } from "../../../features/help/articles";
import { helpBreadcrumb, helpCollectionSchema, helpMeta } from "../../../features/help/seo";
import { helpHref } from "../../../lib/hosts";

type Params = { category: string };

export const generateStaticParams = () => CATEGORIES.map((c) => ({ category: c.slug }));
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const c = categoryBySlug((await params).category);
  if (!c) return {};
  return helpMeta({ title: `${c.title} — Naazhi Help`, description: c.description, path: `/${c.slug}` });
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const c = categoryBySlug((await params).category);
  if (!c) notFound();
  const items = articlesIn(c.slug);
  return (
    <main>
      <JsonLd
        data={[
          ...helpCollectionSchema({ name: c.title, description: c.description, path: `/${c.slug}`, items: items.map((a) => ({ name: a.title, description: a.summary, path: `/${c.slug}/${a.slug}` })) }),
          helpBreadcrumb([{ name: c.title, path: `/${c.slug}` }]),
        ]}
      />
      <section className={`${WRAP} pt-[clamp(32px,5vw,64px)]`}>
        <nav aria-label="Breadcrumb" className="text-[13.5px] text-fg-subtle">
          <Link href={helpHref("/")} className="hover:text-fg">
            Help
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <span className="text-fg">{c.title}</span>
        </nav>
        <div className="mt-6 flex items-start gap-5">
          <IconBadge icon={c.icon} className="size-14" />
          <div>
            <h1 className="font-serif text-[clamp(32px,4.4vw,52px)] leading-[1.08] font-semibold tracking-[-0.03em]">{c.title}</h1>
            <p className="mt-3 max-w-[620px] text-[17px] leading-relaxed text-fg-muted">{c.description}</p>
          </div>
        </div>
      </section>
      <Section tight>
        <Reveal>
          <Surface className="mx-auto max-w-[860px] overflow-hidden">
            <ul className="divide-y divide-line">
              {items.map((a) => (
                <li key={a.slug}>
                  <Link href={helpHref(`/${c.slug}/${a.slug}`)} className="group flex items-center justify-between gap-4 px-5 py-5 transition-colors hover:bg-surface-muted sm:px-7">
                    <span>
                      <span className="block text-[17px] font-medium text-fg">{a.title}</span>
                      <span className="mt-1 block text-[14.5px] leading-relaxed text-fg-muted">{a.summary}</span>
                    </span>
                    <FA icon={faArrowRight} className="shrink-0 text-[13px] text-fg-faint transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </Surface>
          <p className="mx-auto mt-5 max-w-[860px] text-[14px] text-fg-subtle">
            Not here? <Link className="text-green-fg underline underline-offset-2" href={`${helpHref("/search")}`}>Search all articles</Link>.
          </p>
        </Reveal>
      </Section>
    </main>
  );
}

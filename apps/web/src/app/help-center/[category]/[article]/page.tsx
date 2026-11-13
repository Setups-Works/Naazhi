import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleBody from "../../../../components/help/ArticleBody";
import JsonLd from "../../../../components/site/JsonLd";
import { buttonClass, Section, Surface, WRAP } from "../../../../components/site/ui";
import { ARTICLES, articleBySlug, articlesIn, categoryBySlug, findArticle } from "../../../../features/help/articles";
import { helpArticleSchemas, helpMeta } from "../../../../features/help/seo";
import { helpHref, siteHref } from "../../../../lib/hosts";
import { OPERATOR } from "../../../../lib/legal";

type Params = { category: string; article: string };

export const generateStaticParams = () => ARTICLES.map((a) => ({ category: a.category, article: a.slug }));
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { category, article } = await params;
  const a = articleBySlug(category, article);
  if (!a) return {};
  return helpMeta({ title: `${a.title} — Naazhi Help`, description: a.summary, path: `/${a.category}/${a.slug}` });
}

const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function Page({ params }: { params: Promise<Params> }) {
  const { category, article } = await params;
  const a = articleBySlug(category, article);
  const c = categoryBySlug(category);
  if (!a || !c) notFound();
  const siblings = articlesIn(c.slug);
  const related = (a.related ?? []).flatMap((s) => {
    const r = findArticle(s);
    return r ? [r] : [];
  });
  const feedback = `mailto:${OPERATOR.email}?subject=${encodeURIComponent(`Help article: ${a.title}`)}&body=${encodeURIComponent("What was missing or unclear?\n\n")}`;
  return (
    <main>
      <JsonLd data={helpArticleSchemas(a)} />
      <div className={`${WRAP} pt-[clamp(28px,4vw,56px)]`}>
        <nav aria-label="Breadcrumb" className="text-[13.5px] text-fg-subtle">
          <Link href={helpHref("/")} className="hover:text-fg">
            Help
          </Link>
          <span aria-hidden className="mx-2">
            /
          </span>
          <Link href={helpHref(`/${c.slug}`)} className="hover:text-fg">
            {c.title}
          </Link>
        </nav>
      </div>
      <Section tight>
        <div className="mx-auto grid max-w-[1040px] items-start gap-[clamp(28px,5vw,64px)] lg:grid-cols-[minmax(0,1fr)_260px]">
          <article>
            <h1 className="font-serif text-[clamp(30px,4vw,46px)] leading-[1.1] font-semibold tracking-[-0.03em]">{a.title}</h1>
            <p className="mt-4 text-[18px] leading-relaxed text-fg-muted">{a.summary}</p>
            <p className="mt-3 text-[13px] text-fg-subtle">
              Checked <time dateTime={a.updated}>{day(a.updated)}</time>
            </p>
            <div className="mt-8 border-t border-line pt-8">
              <ArticleBody blocks={a.blocks} />
            </div>

            <Surface variant="soft" className="mt-12 flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[16px] font-medium text-fg">Did this answer your question?</p>
                <p className="mt-1 text-[14px] text-fg-muted">If something was missing or unclear, tell us and we will fix the article.</p>
              </div>
              <a className={`${buttonClass("secondary", "sm")} shrink-0`} href={feedback}>
                Tell us what was missing
              </a>
            </Surface>

            {related.length > 0 && (
              <section className="mt-12" aria-labelledby="related">
                <h2 id="related" className="font-serif text-[24px] font-semibold tracking-[-0.02em]">
                  Related articles
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link href={helpHref(`/${r.category}/${r.slug}`)} className="block h-full">
                        <Surface lift className="h-full p-5">
                          <p className="text-[15.5px] font-medium text-fg">{r.title}</p>
                          <p className="mt-1 text-[13.5px] leading-relaxed text-fg-muted">{r.summary}</p>
                        </Surface>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>

          <aside className="lg:sticky lg:top-24" aria-label="In this topic">
            <p className="mb-3 text-[12px] font-semibold text-fg">In {c.title}</p>
            <ul className="flex flex-col border-l border-line">
              {siblings.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={helpHref(`/${s.category}/${s.slug}`)}
                    aria-current={s.slug === a.slug ? "page" : undefined}
                    className={`-ml-px block border-l py-1.5 pl-4 text-[14px] leading-snug transition-colors ${s.slug === a.slug ? "border-fg font-medium text-fg" : "border-transparent text-fg-muted hover:border-line-strong hover:text-fg"}`}
                  >
                    {s.title}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[13.5px] leading-relaxed text-fg-subtle">
              Still stuck? <Link className="text-green-fg underline underline-offset-2" href={siteHref("/contact")}>Write to us</Link>.
            </p>
          </aside>
        </div>
      </Section>
    </main>
  );
}

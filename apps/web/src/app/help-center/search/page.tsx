import type { Metadata } from "next";
import Link from "next/link";
import HelpSearch from "../../../components/help/HelpSearch";
import { Section, Surface, WRAP } from "../../../components/site/ui";
import { categoryBySlug } from "../../../features/help/articles";
import { helpMeta } from "../../../features/help/seo";
import { searchArticles } from "../../../features/help/search";
import { helpHref, siteHref } from "../../../lib/hosts";

// Search results are not pages to rank: they depend on the query, and every article already has its own address.
export const metadata: Metadata = helpMeta({ title: "Search — Naazhi Help", description: "Search the Naazhi help center.", path: "/search", noindex: true });

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.slice(0, 120).trim() ?? "";
  const results = q ? searchArticles(q, 30) : [];
  return (
    <main>
      <section className={`${WRAP} pt-[clamp(32px,5vw,64px)]`}>
        <h1 className="font-serif text-[clamp(30px,4vw,44px)] leading-tight font-semibold tracking-[-0.03em]">{q ? <>Results for “{q}”</> : "Search the help center"}</h1>
        <div className="mt-6 max-w-[640px]">
          <HelpSearch />
        </div>
      </section>
      <Section tight>
        <div className="mx-auto max-w-[860px]">
          {q && results.length === 0 ? (
            <Surface className="p-6 sm:p-8">
              <p className="text-[17px] font-medium text-fg">Nothing found for “{q}”.</p>
              <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">
                Try fewer or different words, or{" "}
                <Link className="text-green-fg underline underline-offset-2" href={helpHref("/")}>
                  browse the topics
                </Link>
                . You can also <Link className="text-green-fg underline underline-offset-2" href={siteHref("/contact")}>write to us</Link>.
              </p>
            </Surface>
          ) : results.length > 0 ? (
            <>
              <p className="mb-4 text-[14px] text-fg-subtle">
                {results.length} {results.length === 1 ? "article" : "articles"}
              </p>
              <Surface className="overflow-hidden">
                <ul className="divide-y divide-line">
                  {results.map((a) => (
                    <li key={a.slug}>
                      <Link href={helpHref(`/${a.category}/${a.slug}`)} className="block px-5 py-4 transition-colors hover:bg-surface-muted sm:px-6">
                        <span className="block text-[16.5px] font-medium text-fg">{a.title}</span>
                        <span className="mt-0.5 block text-[12.5px] text-fg-subtle">{categoryBySlug(a.category)?.title}</span>
                        <span className="mt-1.5 block text-[14.5px] leading-relaxed text-fg-muted">{a.summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Surface>
            </>
          ) : null}
        </div>
      </Section>
    </main>
  );
}

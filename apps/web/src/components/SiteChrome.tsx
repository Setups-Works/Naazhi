import Link from "next/link";
import { FOOTER_COLS, GITHUB_REPO, MEGA, MENU, NAV_LINKS } from "../lib/site";
import AuthLink from "./auth/AuthLink";
import { SiteHeaderBar } from "./landing/Nav";
import { WRAP } from "./landing/Kit";
import { BrandMark } from "./BrandMark";

export function SiteHeader() {
  return <SiteHeaderBar mega={MEGA} links={NAV_LINKS} menu={MENU} />;
}

/**
 * The footer, in the plain product-site manner: the name and what it is, a get-started and a get-the-app link, four columns of
 * links, and a thin line with the legal bits. No panel; it sits on the page.
 */
export function SiteFooter() {
  return (
    <footer className="relative mt-[clamp(32px,5vw,72px)] border-t border-line bg-surface/40 pt-[clamp(40px,6vw,72px)] pb-8">
      <div className={WRAP}>
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div className="flex flex-col items-start gap-4">
            <Link href="/" className="flex items-center gap-2.5 font-serif text-[26px] tracking-[-0.02em]">
              <BrandMark size={32} />
              Naazhi
            </Link>
            <p className="max-w-xs text-[15px] leading-relaxed text-fg-muted">
              One workspace for your notes, tasks, journal and chat. Your AI can change. Your workspace shouldn’t.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <AuthLink className="btn btn-primary btn-sm" />
              <a href={`${GITHUB_REPO}/releases/latest`} target="_blank" rel="noopener noreferrer" className="text-[14.5px] text-green-fg underline-offset-4 hover:underline">
                Get the Android app ›
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {FOOTER_COLS.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <div className="mb-3 text-[12px] font-semibold text-fg">{c.title}</div>
                <ul className="flex flex-col gap-2">
                  {c.links.map(([l, h]) => (
                    <li key={l}>
                      <Link href={h} className="text-[13.5px] text-fg-muted transition-colors hover:text-fg">
                        {l}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[12.5px] text-fg-subtle">
          <span>© {new Date().getFullYear()} Naazhi. All rights reserved.</span>
          <span className="flex items-center gap-2">
            Backed by <span className="font-medium text-fg">Setups Works</span>
            <span lang="ta" className="font-sans text-fg-muted">
              செட்டப்ஸ் வொர்க்ஸ்
            </span>
          </span>
        </div>
      </div>
    </footer>
  );
}

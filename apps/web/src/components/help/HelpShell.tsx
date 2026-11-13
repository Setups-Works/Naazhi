import Link from "next/link";
import { BrandMark } from "../BrandMark";
import AuthLink from "../auth/AuthLink";
import { CATEGORIES } from "../../features/help/articles";
import { helpHref, siteHref } from "../../lib/hosts";
import { buttonClass, WRAP } from "../site/ui";
import HelpSearch from "./HelpSearch";

const link = "rounded-pill px-3 py-1.5 text-[14px] text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg";

/** The help center's own top bar: the same slim frosted bar as the website's, with the name, a search box and a way back into the product. */
export function HelpHeader({ withSearch = true }: { withSearch?: boolean }) {
  return (
    <header className="sticky top-0 z-40">
      <div aria-hidden className="absolute inset-0 -z-10 border-b border-line bg-surface/80 backdrop-blur-xl" />
      <div className={`${WRAP} flex h-[60px] items-center justify-between gap-4`}>
        <Link href={helpHref("/")} className="flex shrink-0 items-center gap-2.5 font-brand text-[23px] tracking-[-0.02em]">
          <BrandMark size={28} />
          Naazhi
          <span className="rounded-pill bg-green-bg px-2.5 py-0.5 font-sans text-[12px] font-medium tracking-normal text-green-fg">Help</span>
        </Link>
        {withSearch && (
          <div className="hidden max-w-[380px] flex-1 md:block">
            <HelpSearch size="sm" placeholder="Search help" />
          </div>
        )}
        <nav aria-label="Help" className="flex items-center gap-1">
          <Link href={siteHref("/roadmap")} className={`${link} hidden lg:inline-block`}>
            Roadmap
          </Link>
          <Link href={siteHref("/contact")} className={`${link} hidden sm:inline-block`}>
            Contact
          </Link>
          <AuthLink className={buttonClass("primary", "sm")} signedIn="Open Naazhi">
            Get started
          </AuthLink>
        </nav>
      </div>
    </header>
  );
}

/** The help center's footer: the topics, the product, and the legal pages. Links to the website use its own address when it has one. */
export function HelpFooter() {
  const col = "flex flex-col gap-1";
  const a = "block py-1.5 text-[13.5px] leading-snug text-fg-muted transition-colors hover:text-fg";
  return (
    <footer className="border-t border-line bg-surface-muted/50 pt-[clamp(36px,5vw,64px)] pb-8">
      <div className={WRAP}>
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div className="flex flex-col items-start gap-3">
            <Link href={helpHref("/")} className="flex items-center gap-2.5 font-brand text-[24px] tracking-[-0.02em]">
              <BrandMark size={30} />
              Naazhi Help
            </Link>
            <p className="max-w-xs text-[14.5px] leading-relaxed text-fg-muted">Answers for the Naazhi workspace. Can’t find yours? Write to us and a person replies.</p>
            <Link href={siteHref("/contact")} className={buttonClass("secondary", "sm")}>
              Contact us
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
            <nav aria-label="Topics">
              <p className="mb-3 text-[12px] font-semibold text-fg">Topics</p>
              <ul className={col}>
                {CATEGORIES.slice(0, 6).map((c) => (
                  <li key={c.slug}>
                    <Link href={helpHref(`/${c.slug}`)} className={a}>
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="More topics">
              <p className="mb-3 text-[12px] font-semibold text-fg">More</p>
              <ul className={col}>
                {CATEGORIES.slice(6).map((c) => (
                  <li key={c.slug}>
                    <Link href={helpHref(`/${c.slug}`)} className={a}>
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Naazhi">
              <p className="mb-3 text-[12px] font-semibold text-fg">Naazhi</p>
              <ul className={col}>
                {(
                  [
                    ["Website", "/"],
                    ["Roadmap", "/roadmap"],
                    ["Request a feature", "/feature-requests"],
                    ["Changelog", "/changelog"],
                    ["Status", "/status"],
                    ["Privacy Policy", "/privacy"],
                    ["Terms", "/terms"],
                    ["Cookies", "/cookies"],
                  ] as const
                ).map(([label, path]) => (
                  <li key={label}>
                    <Link href={siteHref(path)} className={a}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
        <p className="mt-10 border-t border-line pt-5 text-[12.5px] leading-relaxed text-fg-subtle">
          © {new Date().getFullYear()} Naazhi. All rights reserved. Names and logos of other companies belong to their owners; Naazhi is not affiliated with or endorsed by them.
          Articles describe what Naazhi does today. Features marked Coming soon or Building are not available yet.
        </p>
      </div>
    </footer>
  );
}

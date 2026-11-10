import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "../BrandMark";
import AuthLink from "../auth/AuthLink";
import { FOOTER_COLS, GITHUB_REPO } from "../../lib/site";
import StoreBadges from "./StoreBadges";
import { buttonClass, TextLink, WRAP } from "./ui";

/**
 * The footer, in the plain product-site manner: the name and what it is, a way in, four columns of links and a thin line with the
 * legal bits. No panel; it sits on the page.
 */
export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface-muted/50 pt-[clamp(40px,6vw,72px)] pb-8">
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
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <AuthLink className={buttonClass("primary", "sm")} />
              <TextLink href={`${GITHUB_REPO}/releases/latest`} external>
                Get the Android app
              </TextLink>
            </div>
            <StoreBadges />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {FOOTER_COLS.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <p className="mb-3 text-[12px] font-semibold text-fg">{c.title}</p>
                <ul className="flex flex-col gap-2">
                  {c.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="inline-block py-1.5 text-[13.5px] text-fg-muted transition-colors hover:text-fg sm:py-0">
                        {label}
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
          <span className="flex items-center gap-3">
            Backed by
            <Image src="/brand/setups-works.png" alt="Setups Works, the digital agency" width={982} height={360} className="h-10 w-auto" />
          </span>
        </div>
      </div>
    </footer>
  );
}

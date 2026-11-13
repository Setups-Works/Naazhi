import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "../BrandMark";
import AuthLink from "../auth/AuthLink";
import { FOOTER_COLS } from "../../lib/site";
import FooterNotes from "./FooterNotes";
import GooglePlayBadge from "./GooglePlayBadge";
import SocialLinks from "./SocialLinks";
import { buttonClass, WRAP } from "./ui";

/**
 * The footer, in the plain product-site manner: the name and what it is, a way in, four columns of links and a thin line with the
 * legal bits. No panel; it sits on the page.
 */
export default function Footer() {
  return (
    <footer data-site-chrome className="border-t border-line bg-surface-muted/50 pt-[clamp(40px,6vw,72px)] pb-8">
      <div className={WRAP}>
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.8fr)] xl:gap-14">
          <div className="flex flex-col items-start gap-4">
            <Link href="/" className="flex items-center gap-2.5 font-brand text-[26px] tracking-[-0.02em]">
              <BrandMark size={32} />
              Naazhi
            </Link>
            <p className="max-w-xs text-[15px] leading-relaxed text-fg-muted">
              One workspace for your notes, tasks, journal and chat. Your AI can change. Your workspace shouldn’t.
            </p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <AuthLink className={buttonClass("primary", "sm")} />
              <GooglePlayBadge size="sm" />
            </div>
            <SocialLinks />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
            {FOOTER_COLS.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <p className="mb-4 text-[12px] font-semibold text-fg">{c.title}</p>
                <ul className="flex flex-col gap-1">
                  {c.links.map(([label, href]) => (
                    <li key={label}>
                      <Link href={href} className="block py-1.5 text-[13.5px] leading-snug lg:whitespace-nowrap text-fg-muted transition-colors hover:text-fg">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <FooterNotes />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-[12.5px] text-fg-subtle">
          <span>© {new Date().getFullYear()} Naazhi. All rights reserved.</span>
          <span className="flex items-center gap-3">
            Backed by
            <Image src="/brand/health-heart.png" alt="" width={64} height={64} aria-hidden className="size-3.5 object-contain" />
            <Image src="/brand/setups-works.png" alt="Setups Works" width={982} height={360} className="h-10 w-auto" />
          </span>
        </div>
      </div>
    </footer>
  );
}

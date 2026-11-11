"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { internalPath, publicPath } from "../../lib/hosts";

export type PillPage = {
  href: string;
  t: string;
  /** Whether this page is the open one, given the current address. */
  match: (path: string) => boolean;
  /** A small count shown next to the name (for example invitations waiting). */
  badge?: number;
};

/** Segmented control between sibling pages at the top of a page (grey track, white active segment). Each page keeps its own address. */
export default function PillSwitch({ label, pages, className = "max-w-[1120px]" }: { label: string; pages: readonly PillPage[]; className?: string }) {
  // The address bar may show the clean path (/workspace); the match functions are written against the route (/dashboard/workspace).
  const path = internalPath(usePathname());
  return (
    <nav aria-label={label} className={`mx-auto mb-5 flex w-full ${className}`}>
      <div className="inline-flex gap-0.5 rounded-ctl bg-hover p-[3px]">
        {pages.map((p) => {
          const on = p.match(path);
          return (
            <Link
              key={p.href}
              href={publicPath(p.href)}
              aria-current={on ? "page" : undefined}
              className={`inline-flex h-[28px] items-center gap-2 rounded-tab px-3 text-[13px] font-medium transition-colors ${on ? "bg-raised text-fg shadow-e1" : "text-fg-muted hover:text-fg"}`}
            >
              {p.t}
              {!!p.badge && (
                <span className="rounded-pill bg-critical-wash px-1.5 py-px text-[11px] font-semibold text-critical" aria-label={`${p.badge} waiting`}>
                  {p.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

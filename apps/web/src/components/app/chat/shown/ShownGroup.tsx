import Link from "next/link";
import type { ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import type { Tone } from "../../../../lib/tones";

/**
 * One group of cards a chat reply asked the app to show: a tinted glass card with a title, the items, and an Open button that goes to
 * the real page. The tint is the same one that area uses everywhere (journal violet, to-dos amber, notes blue, health mint).
 */
export default function ShownGroup({
  tone,
  icon,
  logo,
  title,
  openLabel,
  openHref,
  note,
  children,
}: {
  tone: Tone;
  icon: IconDefinition;
  /** The app's logo (an address under /logos), drawn in place of the icon. */
  logo?: string;
  title: string;
  openLabel: string;
  openHref: string;
  /** A small line under the items, for example "2 more". */
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-3 rounded-r3 border bg-raised p-4 text-ink" data-tone={tone} aria-label={title}>
      <p className="m-0 flex items-center gap-2 text-[13px] font-medium text-ink-2">
        <span className="grid size-7 place-items-center rounded-ctl bg-hover text-[12px] text-ink-2">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" width={16} height={16} className="object-contain" />
          ) : (
            <FA icon={icon} />
          )}
        </span>
        {title}
      </p>
      <ul className="mt-2.5 flex flex-col gap-2">{children}</ul>
      {note && <p className="mt-2 text-[12.5px] text-fg-subtle">{note}</p>}
      <Link href={openHref} className="btn btn-secondary btn-sm mt-3 inline-flex h-9 px-4 text-[13px]">
        {openLabel} <FA icon={faArrowRight} aria-hidden />
      </Link>
    </section>
  );
}

/** One row inside a group: a glass strip with the item's text and its own Open link. */
export function ShownRow({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        aria-label={label}
        className="flex flex-col gap-0.5 rounded-ctl bg-hover px-3 py-2 transition-colors hover:bg-press"
      >
        {children}
      </Link>
    </li>
  );
}

export const ShownEmpty = ({ children }: { children: ReactNode }) => (
  <li className="rounded-ctl bg-hover px-3 py-2 text-[13.5px] text-ink-2">{children}</li>
);

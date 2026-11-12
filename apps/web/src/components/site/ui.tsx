import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { Heading } from "./Heading";
import { Reveal } from "./Reveal";

/*
 * The public site's building blocks. One palette on purpose: white canvas, ink text, a single forest-green accent with its soft tint,
 * and an ink panel for the closing calls to action. Surfaces are separated by hairline rings, never by drop shadows; "glass" is a
 * frosted, translucent surface (header, menus), not a shadowed one.
 */

/** The centred page column used by every section. */
export const WRAP = "mx-auto w-full max-w-(--container) px-(--gutter)";

type Band = "plain" | "soft" | "ink";
const BANDS: Record<Band, string> = {
  plain: "",
  soft: "bg-green-bg/40 border-y border-green-fg/10",
  ink: "bg-fill-dark text-on-dark",
};

/** A band of the page. `band="soft"` tints it with the pale green, `band="ink"` makes it the dark panel. */
export function Section({
  id,
  children,
  className = "",
  tight = false,
  band = "plain",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  tight?: boolean;
  band?: Band;
}) {
  return (
    <section id={id} className={`relative scroll-mt-20 ${tight ? "py-[clamp(36px,5vw,72px)]" : "py-[clamp(64px,9vw,128px)]"} ${BANDS[band]} ${className}`}>
      <div className={WRAP}>{children}</div>
    </section>
  );
}

/** The small green label above a heading. */
export function Kicker({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <p className={`text-[13px] font-semibold tracking-[0.08em] uppercase ${dark ? "text-on-dark/70" : "text-green-fg"}`}>{children}</p>;
}

export const Lead = ({ children, className = "", dark = false }: { children: ReactNode; className?: string; dark?: boolean }) => (
  <p className={`max-w-[640px] text-[clamp(17px,1.6vw,20px)] leading-relaxed text-pretty ${dark ? "text-on-dark/70" : "text-fg-muted"} ${className}`}>{children}</p>
);

/** A section's opening: kicker, heading, one sentence. */
export function SectionHead({
  kicker,
  title,
  quiet,
  lead,
  align = "center",
  dark = false,
  heart = false,
}: {
  kicker?: string;
  title: string;
  quiet?: string;
  lead?: ReactNode;
  align?: "center" | "left";
  dark?: boolean;
  /** The pink heart after the heading's `quiet` words. */
  heart?: boolean;
}) {
  const centre = align === "center";
  return (
    <div className={`flex flex-col gap-3 ${centre ? "mx-auto items-center text-center" : "items-start text-left"}`}>
      {kicker && (
        <Reveal>
          <Kicker dark={dark}>{kicker}</Kicker>
        </Reveal>
      )}
      <Heading quiet={quiet} dark={dark} heart={heart} className="max-w-[820px]">
        {title}
      </Heading>
      {lead && (
        <Reveal delay={120}>
          <Lead dark={dark} className={centre ? "mx-auto" : ""}>
            {lead}
          </Lead>
        </Reveal>
      )}
    </div>
  );
}

const SURFACES = {
  card: "bg-surface ring-1 ring-line",
  soft: "bg-green-bg/60 ring-1 ring-green-fg/15",
  ink: "bg-fill-dark text-on-dark",
  glass: "bg-surface/70 backdrop-blur-xl ring-1 ring-line",
} as const;
const RADII = { r3: "rounded-r3", r4: "rounded-r4", r5: "rounded-r5", pill: "rounded-pill" } as const;

/** A surface: a white card with a hairline ring, the pale-green card, the ink panel, or frosted glass. No shadows. */
export function Surface({
  as: Tag = "div",
  variant = "card",
  radius = "r4",
  lift = false,
  className = "",
  children,
  ...rest
}: {
  as?: ElementType;
  variant?: keyof typeof SURFACES;
  radius?: keyof typeof RADII;
  /** Raises the surface a little on hover. */
  lift?: boolean;
  className?: string;
  children?: ReactNode;
  id?: string;
  role?: string;
  "aria-label"?: string;
}) {
  return (
    <Tag
      className={`${SURFACES[variant]} ${RADII[radius]} ${lift ? "transition-transform duration-300 ease-site hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0" : ""} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

const BUTTONS = {
  primary: "bg-fill-dark text-on-dark hover:bg-fg",
  secondary: "bg-surface text-fg ring-1 ring-line-strong hover:bg-surface-muted",
  light: "bg-surface text-fg hover:bg-surface-muted",
  ghost: "bg-on-dark/10 text-on-dark ring-1 ring-on-dark/20 hover:bg-on-dark/20",
} as const;

/** The button look as a class string, for links that already render their own element (such as `AuthLink`). */
export const buttonClass = (variant: keyof typeof BUTTONS = "primary", size: "md" | "sm" = "md") =>
  `inline-flex items-center justify-center gap-2 rounded-pill font-medium whitespace-nowrap transition-[transform,background-color] duration-300 ease-site active:scale-95 ${
    size === "sm" ? "h-9 px-4 text-[14px]" : "h-12 px-6 text-[15px]"
  } ${BUTTONS[variant]}`;

export function ButtonLink({
  href,
  variant = "primary",
  arrow = false,
  external = false,
  children,
}: {
  href: string;
  variant?: keyof typeof BUTTONS;
  arrow?: boolean;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant)} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
      {arrow && <FA icon={faArrowRight} />}
    </Link>
  );
}

/** A quiet text link: "Learn more ›". */
export function TextLink({ href, children, external = false }: { href: string; children: ReactNode; external?: boolean }) {
  return (
    <Link href={href} className="text-[16px] text-green-fg underline-offset-4 hover:underline" {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children} ›
    </Link>
  );
}

/** The rounded square an icon sits in. */
export function IconBadge({ icon, className = "", dark = false }: { icon: IconDefinition; className?: string; /** On an ink panel: light icon on a faint light square (the accent colours would be dark on dark). */ dark?: boolean }) {
  return (
    <span className={`grid size-11 shrink-0 place-items-center rounded-r2 text-[17px] ${dark ? "bg-on-dark/10 text-on-dark" : "bg-green-bg text-green-fg"} ${className}`}>
      <FA icon={icon} />
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-grid h-7 min-w-7 place-items-center rounded-r1 bg-surface px-2 font-mono text-[12px] text-fg ring-1 ring-line-strong">{children}</kbd>;
}

const STATUS = {
  live: { label: "Live", cls: "bg-green-bg text-green-fg", tip: "You can use this today." },
  building: { label: "Building", cls: "bg-amber-bg text-amber-fg", tip: "In development now." },
  soon: { label: "Coming soon", cls: "bg-surface-sunken text-fg-muted", tip: "Planned. Not available yet." },
} as const;
export type Status = keyof typeof STATUS;
export const statusTip = (s: Status) => STATUS[s].tip;

/** The honest status of a capability: shipped today, being built, or planned. */
export function StatusChip({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-[11.5px] font-medium ${s.cls}`}>
      <i className="size-1.5 rounded-full bg-current" aria-hidden />
      {s.label}
    </span>
  );
}

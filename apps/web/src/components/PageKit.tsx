import Link from "next/link";
import type { ReactNode } from "react";
import { FontAwesomeIcon as FA } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import AuthLink from "./auth/AuthLink";
import Glass from "./landing/Glass";
import { BTN_GHOST_DARK, BTN_LIGHT, IconTile, Lead, Section, SectionHead as Head, Title, WRAP } from "./landing/Kit";
import { Magnetic } from "./landing/Magnetic";
import Phone from "./landing/Phone";
import { R, Reveal } from "./landing/Reveal";
import { isTone, type Tone } from "../lib/tones";

export { Head as SectionHead };

/**
 * The top of every public page, kept plain: a small green label, one big serif line, one sentence and the calls to action.
 * `visual` is optional artwork shown under the text (usually the app on a phone).
 */
export function PageHero({
  eyebrow,
  title,
  quiet,
  lead,
  status,
  children,
  visual,
}: {
  eyebrow: string;
  title: string;
  quiet?: string;
  lead: string;
  /** Honest label for pages that describe something not fully built yet. */
  status?: ReactNode;
  children?: ReactNode;
  visual?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden pt-[clamp(44px,7vw,104px)] pb-[clamp(24px,4vw,56px)] text-center">
      <div className={`${WRAP} relative flex flex-col items-center`}>
        <Reveal className="flex flex-wrap items-center justify-center gap-3">
          <p className="text-[clamp(15px,1.4vw,18px)] font-medium text-green-fg">{eyebrow}</p>
          {status}
        </Reveal>
        <Title as="h1" size="display" onLoad className="mt-3 max-w-[900px]" quiet={quiet}>
          {title}
        </Title>
        <Reveal delay={600} className="mt-5">
          <Lead className="mx-auto text-[clamp(18px,1.8vw,22px)]">{lead}</Lead>
        </Reveal>
        {children && (
          <Reveal delay={800} className="mt-8">
            <div className="flex flex-wrap items-center justify-center gap-3">{children}</div>
          </Reveal>
        )}
        {visual && (
          <Reveal delay={900} className="mt-[clamp(36px,6vw,80px)] w-full">
            {visual}
          </Reveal>
        )}
      </div>
    </section>
  );
}

/** Three phones in a row, cut off by the bottom edge of the section: the artwork for a page hero. */
export function PhoneRow({ screens }: { screens: [string, string, string] }) {
  return (
    <div className="relative mx-auto h-[clamp(260px,40vw,480px)] w-full max-w-[760px] overflow-hidden" role="img" aria-label="The Naazhi app on three iPhones">
      <div className="absolute bottom-0 left-[6%] w-[29%] translate-y-[22%] sm:left-[9%]">
        <Phone src={screens[0]} alt="" className="w-full" />
      </div>
      <div className="absolute right-[6%] bottom-0 w-[29%] translate-y-[22%] sm:right-[9%]">
        <Phone src={screens[2]} alt="" className="w-full" />
      </div>
      <div className="absolute bottom-0 left-1/2 z-10 w-[35%] -translate-x-1/2 translate-y-[12%]">
        <Phone src={screens[1]} alt="" className="w-full" />
      </div>
    </div>
  );
}

export function FeatureCards({
  items,
  cols = 3,
}: {
  items: { icon: IconDefinition; t: string; d: string; tone?: Tone | string }[];
  cols?: 2 | 3 | 4;
}) {
  const grid = cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <Reveal stagger={0.09} className={`mt-[clamp(28px,4vw,48px)] grid gap-4 ${grid}`}>
      {items.map((x) => {
        const tone = String(x.tone ?? "").replace(/^tone-/, "");
        return (
          <R key={x.t}>
            <Glass variant="flat" radius="r4" tone={isTone(tone) ? tone : "sand"} lift className="flex h-full flex-col gap-3 p-6">
              <IconTile icon={x.icon} />
              <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.01em] text-fg">{x.t}</h3>
              <p className="text-[15px] leading-relaxed text-fg-muted">{x.d}</p>
            </Glass>
          </R>
        );
      })}
    </Reveal>
  );
}

/**
 * The closing call to action: a smoked-glass panel with the headline and one or two buttons. With `phone` (a screenshot under
 * /mobile) an iPhone rises from the bottom edge beside the text.
 */
export function CtaPanel({
  title,
  quiet,
  lead,
  primary = ["Get started", "/signup"],
  secondary,
  phone,
}: {
  title: string;
  quiet?: string;
  lead: string;
  primary?: [string, string];
  secondary?: [string, string];
  phone?: string;
}) {
  return (
    <Section>
      <Reveal>
        <Glass variant="dark" radius="r5" className="relative overflow-hidden">
          <div
            className={`grid items-center gap-8 px-[clamp(24px,5vw,72px)] pt-[clamp(44px,6vw,88px)] ${
              phone ? "lg:grid-cols-[1.15fr_0.85fr]" : "pb-[clamp(44px,6vw,88px)] text-center"
            }`}
          >
            <div className={`flex flex-col gap-5 ${phone ? "items-start pb-[clamp(36px,4vw,72px)] text-left" : "mx-auto max-w-2xl items-center"}`}>
              <Title dark quiet={quiet}>
                {title}
              </Title>
              <Lead dark className={phone ? "" : "mx-auto"}>
                {lead}
              </Lead>
              <div className={`mt-3 flex flex-wrap items-center gap-3 ${phone ? "" : "justify-center"}`}>
                <Magnetic>
                  {primary[1] === "/signup" ? (
                    <AuthLink arrow className={BTN_LIGHT}>
                      {primary[0]}
                    </AuthLink>
                  ) : (
                    <Link className={BTN_LIGHT} href={primary[1]}>
                      {primary[0]} <FA icon={faArrowRight} />
                    </Link>
                  )}
                </Magnetic>
                {secondary && (
                  <Link className={BTN_GHOST_DARK} href={secondary[1]}>
                    {secondary[0]}
                  </Link>
                )}
              </div>
            </div>
            {phone && (
              <div className="relative mx-auto -mb-[40%] w-[min(280px,68%)] self-end lg:-mb-[34%]">
                <Phone src={phone} alt="The Naazhi app on an iPhone" className="w-full" />
              </div>
            )}
          </div>
        </Glass>
      </Reveal>
    </Section>
  );
}

"use client";
import { useRef } from "react";
import Link from "next/link";
import AuthLink from "../../auth/AuthLink";
import { GITHUB_REPO } from "../../../lib/site";
import { Lead, WRAP } from "../Kit";
import { Magnetic } from "../Magnetic";
import { showNow, useMotion } from "../motion";
import Phone from "../Phone";
import { Reveal } from "../Reveal";
import { Title } from "../Title";

/**
 * The hero: a small label, one big line, one sentence and two ways in, then the app on three whole iPhones. They rise in together,
 * the outer two fan out from behind the middle one, and as you scroll the fan opens wider while the middle phone lifts toward you.
 */
export default function Hero() {
  const stage = useRef<HTMLDivElement>(null);
  useMotion(stage, ({ g, root, calm }) => {
    const left = root.querySelector<HTMLElement>("[data-left]");
    const right = root.querySelector<HTMLElement>("[data-right]");
    const centre = root.querySelector<HTMLElement>("[data-centre]");
    if (!left || !right || !centre) return;
    if (calm) return void showNow(g, [left, right, centre]);

    const intro = g.timeline({ delay: 0.5 });
    intro
      .fromTo(centre, { y: 110, autoAlpha: 0, scale: 0.94 }, { y: 0, autoAlpha: 1, scale: 1, duration: 1.3, ease: "power3.out" })
      .fromTo(left, { xPercent: 70, rotate: 0, scale: 0.9, autoAlpha: 0 }, { xPercent: 0, rotate: -6, scale: 1, autoAlpha: 1, duration: 1.3, ease: "power3.out" }, "-=0.8")
      .fromTo(right, { xPercent: -70, rotate: 0, scale: 0.9, autoAlpha: 0 }, { xPercent: 0, rotate: 6, scale: 1, autoAlpha: 1, duration: 1.3, ease: "power3.out" }, "<");

    const scrub = { trigger: root, start: "top 25%", end: "bottom top", scrub: 0.8 };
    g.to(left, { xPercent: -16, rotate: -11, y: 40, ease: "none", scrollTrigger: scrub });
    g.to(right, { xPercent: 16, rotate: 11, y: 40, ease: "none", scrollTrigger: scrub });
    g.to(centre, { y: -50, scale: 1.05, ease: "none", scrollTrigger: scrub });
  });

  return (
    <section className="relative overflow-hidden pt-[clamp(36px,6vw,96px)] pb-[clamp(24px,4vw,64px)]">
      <div className={`${WRAP} flex flex-col items-center text-center`}>
        <Reveal>
          <p className="text-[clamp(15px,1.4vw,18px)] font-medium text-green-fg">Introducing Naazhi</p>
        </Reveal>
        <Title as="h1" size="display" onLoad className="mt-3 max-w-[900px]" quiet="Any AI, or none.">
          One workspace.
        </Title>
        <Reveal delay={600} className="mt-5">
          <Lead className="mx-auto text-[clamp(18px,1.8vw,22px)]">Notes, tasks, journal, calendar and chat, together in one calm place.</Lead>
        </Reveal>
        <Reveal delay={800} className="mt-8">
          <div id="start" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Magnetic>
              <AuthLink arrow />
            </Magnetic>
            <Link href={`${GITHUB_REPO}/releases/latest`} className="text-[16px] text-green-fg underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">
              Get the Android app ›
            </Link>
          </div>
        </Reveal>
      </div>

      <div ref={stage} className={`${WRAP} relative mt-[clamp(28px,5vw,64px)]`} role="img" aria-label="The Naazhi app on three iPhones: Chat, Home and Journal">
        <div className="relative mx-auto h-[clamp(380px,56vw,700px)] w-full max-w-[920px]">
          <div className="absolute top-[7%] left-[5%] h-[84%] sm:left-[9%]">
            <div data-left data-reveal className="h-full opacity-0">
              <Phone src="/mobile/chat.png" alt="" className="h-full" />
            </div>
          </div>
          <div className="absolute top-[7%] right-[5%] h-[84%] sm:right-[9%]">
            <div data-right data-reveal className="h-full opacity-0">
              <Phone src="/mobile/journal.png" alt="" className="h-full" />
            </div>
          </div>
          <div className="absolute top-0 left-1/2 z-10 h-full -translate-x-1/2">
            <div data-centre data-reveal className="h-full opacity-0">
              <Phone src="/mobile/home.png" alt="" priority className="h-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

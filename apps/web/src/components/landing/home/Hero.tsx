"use client";
import { useRef } from "react";
import Link from "next/link";
import AuthLink from "../../auth/AuthLink";
import { GITHUB_REPO } from "../../../lib/site";
import { Lead, WRAP } from "../Kit";
import { showNow, useMotion } from "../motion";
import Phone from "../Phone";
import { Reveal } from "../Reveal";
import { Title } from "../Title";

/**
 * The hero, kept quiet: a small label, one big line, one sentence, two ways in, and the real app below, cut off by the edge of
 * the section the way a product page shows a device. Three screens rise into place once; nothing else moves.
 */
export default function Hero() {
  const stage = useRef<HTMLDivElement>(null);
  useMotion(stage, ({ g, root, calm }) => {
    const phones = root.querySelectorAll<HTMLElement>("[data-phone]");
    if (calm) return void showNow(g, phones);
    g.fromTo(phones, { y: 90, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.4, ease: "power3.out", stagger: 0.12, delay: 0.55 });
  });

  return (
    <section className="relative overflow-hidden pt-[clamp(36px,6vw,96px)]">
      <div className={`${WRAP} flex flex-col items-center text-center`}>
        <Reveal>
          <p className="text-[clamp(15px,1.4vw,18px)] font-medium text-green-fg">Introducing Naazhi</p>
        </Reveal>
        <Title as="h1" size="display" onLoad className="mt-3 max-w-[900px]" quiet="Any AI, or none.">
          One workspace.
        </Title>
        <Reveal delay={600} className="mt-5">
          <Lead className="mx-auto text-[clamp(18px,1.8vw,22px)]">
            Notes, tasks, journal, calendar and chat, together in one calm place.
          </Lead>
        </Reveal>
        <Reveal delay={800} className="mt-8">
          <div id="start" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <AuthLink arrow />
            <Link href={`${GITHUB_REPO}/releases/latest`} className="text-[16px] text-green-fg underline-offset-4 hover:underline" target="_blank" rel="noopener noreferrer">
              Get the Android app ›
            </Link>
          </div>
        </Reveal>
      </div>

      <div ref={stage} className={`${WRAP} relative mt-[clamp(36px,6vw,80px)]`} role="img" aria-label="The Naazhi app on three iPhones: Chat, Home and Journal">
        <div className="relative mx-auto h-[clamp(300px,46vw,560px)] w-full max-w-[860px] overflow-hidden">
          <div data-phone data-reveal className="absolute bottom-0 left-[4%] w-[30%] translate-y-[22%] opacity-0 sm:left-[8%]">
            <Phone src="/mobile/chat.png" alt="" className="w-full" />
          </div>
          <div data-phone data-reveal className="absolute right-[4%] bottom-0 w-[30%] translate-y-[22%] opacity-0 sm:right-[8%]">
            <Phone src="/mobile/journal.png" alt="" className="w-full" />
          </div>
          <div className="absolute bottom-0 left-1/2 z-10 w-[36%] -translate-x-1/2 translate-y-[12%]">
            <div data-phone data-reveal className="opacity-0">
              <Phone src="/mobile/home.png" alt="" priority className="w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

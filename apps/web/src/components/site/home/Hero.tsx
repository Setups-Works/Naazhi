"use client";
import { useRef } from "react";
import AuthLink from "../../auth/AuthLink";
import { Heading } from "../Heading";
import { showNow, useMotion } from "../motion";
import GooglePlayBadge from "../GooglePlayBadge";
import HeroDots from "./HeroDots";
import Phone from "../Phone";
import { buttonClass, Kicker, Lead, WRAP } from "../ui";

const SCREENS = [
  { src: "/mobile/calendar.png", alt: "Calendar and to-dos in the Naazhi app" },
  { src: "/mobile/home-2.png", alt: "Home in the Naazhi app" },
  { src: "/mobile/journal-2.png", alt: "The journal in the Naazhi app" },
] as const;

/**
 * The opening: the promise in one line, then three whole phones in a row. On load the side phones slide out from behind the middle one
 * and settle into a gentle fan; once open, all three drift at different speeds, and scrolling pulls the sides apart a little further.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null);
  useMotion(root, ({ g, root: el, calm }) => {
    const copy = el.querySelectorAll("[data-copy]");
    const left = el.querySelector("[data-phone=left]");
    const mid = el.querySelector("[data-phone=mid]");
    const right = el.querySelector("[data-phone=right]");
    const glow = el.querySelector("[data-glow]");
    if (calm) return void showNow(g, [copy, left, mid, right, glow]);

    const tl = g.timeline({ defaults: { ease: "power4.out" } });
    tl.fromTo(copy, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.1 }, 0.35)
      .fromTo(glow, { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.6 }, 0)
      .fromTo(mid, { y: 120, autoAlpha: 0, scale: 0.92 }, { y: 0, autoAlpha: 1, scale: 1, duration: 1.2 }, 0.45)
      .fromTo(left, { xPercent: 78, y: 70, autoAlpha: 0, rotate: 0 }, { xPercent: 0, y: 0, autoAlpha: 1, rotate: -6, duration: 1.4 }, 1)
      .fromTo(right, { xPercent: -78, y: 70, autoAlpha: 0, rotate: 0 }, { xPercent: 0, y: 0, autoAlpha: 1, rotate: 6, duration: 1.4 }, 1);

    // Once open, each phone drifts on its own beat.
    const drift = (target: Element | null, y: number, seconds: number) =>
      target && g.to(target.firstElementChild, { y, duration: seconds, ease: "sine.inOut", repeat: -1, yoyo: true, delay: 2 });
    drift(left, -10, 3.2);
    drift(mid, -14, 3.8);
    drift(right, -8, 3);

    // Scrolling away spreads the sides and lifts the middle.
    const scrub = { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 };
    g.to(left, { xPercent: -14, rotate: -11, y: 40, scrollTrigger: scrub });
    g.to(right, { xPercent: 14, rotate: 11, y: 40, scrollTrigger: scrub });
    g.to(mid, { y: -50, scrollTrigger: scrub });
  });

  const hidden = "opacity-0";
  return (
    <section ref={root} className="relative overflow-hidden pt-10">
      <div
        aria-hidden
        data-glow
        className={`pointer-events-none absolute top-[38%] left-1/2 h-[min(640px,70vw)] w-[min(1100px,120vw)] -translate-x-1/2 rounded-full bg-green-bg blur-3xl ${hidden}`}
      />
      <div className={`${WRAP} relative flex flex-col items-center text-center`}>
        {/* The dots stay behind the words only: the grid ends where the phones begin. */}
        <div className="relative flex w-full flex-col items-center">
          <HeroDots />
          <div data-copy data-reveal className={`relative ${hidden}`}>
            <Kicker>One workspace · Any AI</Kicker>
          </div>
          <div data-copy data-reveal className={`mt-4 ${hidden}`}>
            <Heading as="h1" size="display" quiet="Your workspace shouldn’t." immediate className="max-w-[920px]">
              {/* On a desktop the first sentence is its own line, with the heart kept beside its full stop. */}
              <span className="md:block">
                Your AI can{" "}
                <span className="whitespace-nowrap">
                  change.
                  {/* eslint-disable-next-line @next/next/no-img-element -- a small fixed picture sized by the heading's text */}
                  <img
                    src="/brand/health-heart.png"
                    alt=""
                    width={64}
                    height={64}
                    aria-hidden
                    className="ml-[0.12em] inline-block h-[0.62em] w-[0.62em] object-contain align-[0.02em]"
                  />
                </span>
              </span>
            </Heading>
          </div>
          <div data-copy data-reveal className={`mt-5 ${hidden}`}>
            <Lead className="mx-auto text-[clamp(18px,1.8vw,22px)]">
              Notes, tasks, journal, chat and calendar in one calm place. Use AI when it helps, switch it, or switch it off. Everything
              you’ve written stays put.
            </Lead>
          </div>
          <div data-copy data-reveal className={`mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 ${hidden}`}>
            <AuthLink arrow className={buttonClass("primary")} />
            <GooglePlayBadge />
          </div>
        </div>

        <div
          role="img"
          aria-label="The Naazhi app on three iPhones: calendar, home and journal"
          className="mt-[clamp(40px,6vw,80px)] flex w-full max-w-[980px] items-end justify-center gap-[1%] px-0 sm:gap-[2%] sm:px-2 [mask-image:linear-gradient(to_bottom,black_55%,transparent_98%)]"
        >
          <div data-phone="left" className={`w-[31%] sm:w-[28%] ${hidden}`}>
            <Phone src={SCREENS[0].src} alt="" className="w-full" />
          </div>
          <div data-phone="mid" className={`z-10 w-[40%] sm:w-[36%] ${hidden}`}>
            <Phone src={SCREENS[1].src} alt="" priority className="w-full" />
          </div>
          <div data-phone="right" className={`w-[31%] sm:w-[28%] ${hidden}`}>
            <Phone src={SCREENS[2].src} alt="" className="w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

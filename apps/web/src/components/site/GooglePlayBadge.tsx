import Image from "next/image";
import { GOOGLE_PLAY_URL } from "../../lib/site";
import { buttonClass } from "./ui";

/**
 * "Get it on Google Play", as a button in the site's own style (ink pill with Google Play's own triangle mark), linking to the app's store page.
 * Only the Google Play mark is Google's artwork (their favicon, used as supplied). The trademark line is in the notes at the foot of every page.
 */
export default function GooglePlayBadge({ className = "", size = "md" }: { className?: string; size?: "md" | "sm" }) {
  return (
    // On a computer, hovering (or tabbing to) the button opens a QR card so the app can be installed from a phone. The card is decoration
    // for the mouse only (aria-hidden, never shown on touch devices); the link itself is what everyone else uses.
    <span className="group/qr relative inline-flex">
    <a
      href={GOOGLE_PLAY_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get Naazhi on Google Play"
      className={`${buttonClass("primary", size)} inline-flex items-center gap-3 ${className}`}
    >
      <Image src="/store/google-play-logo.png" alt="" width={128} height={128} aria-hidden className={size === "sm" ? "size-4" : "size-5"} />
      {size === "sm" ? (
        <span>Get it on Google Play</span>
      ) : (
        <span className="flex flex-col items-start text-left leading-none">
          <span className="text-[11px] font-medium tracking-[0.06em] uppercase opacity-70">Get it on</span>
          <span className="mt-1 text-[15px] font-semibold">Google Play</span>
        </span>
      )}
    </a>
    <span
      aria-hidden
      className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-3 w-[224px] -translate-x-1/2 translate-y-1 rounded-r4 bg-raised p-3 text-center opacity-0 shadow-pop shadow-[inset_0_0_0_1px_var(--line)] transition-[opacity,transform,visibility] duration-150 group-hover/qr:visible group-hover/qr:translate-y-0 group-hover/qr:opacity-100 group-focus-within/qr:visible group-focus-within/qr:translate-y-0 group-focus-within/qr:opacity-100 motion-reduce:transition-none [@media(hover:none)]:hidden"
    >
      <Image src="/brand/google-play-qr.svg" alt="" width={200} height={200} unoptimized className="mx-auto size-[200px] rounded-r3" />
      <span className="mt-2 block text-[12.5px] leading-snug font-medium text-fg">Scan to get Naazhi on Google Play</span>
      <span className="absolute top-full left-1/2 -mt-[7px] size-3.5 -translate-x-1/2 rotate-45 rounded-[3px] bg-raised shadow-[2px_2px_0_0_var(--line)]" />
    </span>
    </span>
  );
}

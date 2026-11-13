import Image from "next/image";
import { GOOGLE_PLAY_URL } from "../../lib/site";
import { buttonClass } from "./ui";

/**
 * "Get it on Google Play", as a button in the site's own style (ink pill with Google Play's own triangle mark), linking to the app's store page.
 * Only the Google Play mark is Google's artwork (their favicon, used as supplied). The trademark line is in the notes at the foot of every page.
 */
export default function GooglePlayBadge({ className = "", size = "md" }: { className?: string; size?: "md" | "sm" }) {
  return (
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
  );
}

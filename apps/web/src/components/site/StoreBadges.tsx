import type { CSSProperties } from "react";
import { GITHUB_REPO } from "../../lib/site";

/** The badge artwork is used as a stencil, so it takes the brand green instead of the stores' own colours. */
const stencil = (src: string): CSSProperties => ({
  maskImage: `url(${src})`,
  WebkitMaskImage: `url(${src})`,
  maskSize: "contain",
  WebkitMaskSize: "contain",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
});

const ART = "aspect-[866/290] h-[52px] bg-green-fg sm:h-14";

/**
 * The Android app can be downloaded today (from the GitHub releases), so the Google Play badge links there. The iPhone app is not
 * out yet, so the App Store badge isn't a link and says so. When a listing goes live, point its badge at it.
 */
export default function StoreBadges({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-start gap-x-4 gap-y-3 ${className}`}>
      <li className="flex flex-col items-center gap-1.5">
        <a
          href={`${GITHUB_REPO}/releases/latest`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download the Android app"
          className="transition-opacity hover:opacity-80"
        >
          <span aria-hidden className={`block ${ART}`} style={stencil("/store/google-play.png")} />
        </a>
        <span className="rounded-pill bg-green-bg px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.06em] text-green-fg uppercase">Download APK</span>
      </li>
      <li className="flex flex-col items-center gap-1.5">
        <span role="img" aria-label="App Store, coming soon" className={`block opacity-60 ${ART}`} style={stencil("/store/app-store.png")} />
        <span className="rounded-pill bg-surface-sunken px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.06em] text-fg-muted uppercase">Coming soon</span>
      </li>
    </ul>
  );
}

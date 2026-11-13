"use client";
import { useSyncExternalStore } from "react";
import { buttonClass } from "./ui";

type Os = "mac" | "win" | "other";

const noop = () => () => {};
/** Which computer the visitor is on, from the browser. Phones and tablets (an iPad says it is a Mac) count as "other". */
function osNow(): Os {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/.test(ua)) return "other";
  if (/Windows/.test(ua)) return "win";
  if (/Macintosh|Mac OS X/.test(ua) && navigator.maxTouchPoints < 2) return "mac";
  return "other";
}

const LABEL: Record<"mac" | "win", string> = { mac: "Download for Mac", win: "Download for Windows" };

/**
 * The first button in the Download page's hero. On a Mac or a Windows PC it downloads that app; anywhere else it links down to the list of
 * devices. The server and the first paint say "other"; the browser's answer replaces it right after hydration, so the two can't disagree.
 */
export default function DesktopDownload({ href, devices }: { href: string; devices: string }) {
  const os = useSyncExternalStore(noop, osNow, () => "other" as Os);
  if (os === "other") {
    return (
      <a href={devices} className={buttonClass("secondary")}>
        <span className="inline-flex items-center gap-2">
          See all downloads <span aria-hidden>↓</span>
        </span>
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
      <span className="inline-flex items-center gap-2">
        {LABEL[os]} <span aria-hidden>↓</span>
      </span>
    </a>
  );
}

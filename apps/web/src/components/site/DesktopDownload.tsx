"use client";
import { useEffect, useState, type ReactNode } from "react";
import { buttonClass } from "./ui";

type Hints = { getHighEntropyValues?: (keys: string[]) => Promise<{ architecture?: string }> };

/**
 * The download button of the public site, chosen by device (`<html data-os>` is set before the first paint, see lib/os.ts):
 * on a Mac or a Windows PC it downloads that app, in place of `store`; on an Android phone, an iPhone or anything else it shows `store`
 * (the Google Play button). On Windows it is the x64 installer, or the ARM64 one when the browser says the PC runs on Arm.
 * `devices` adds a "See all downloads" link for everyone who isn't on a Mac or a Windows PC (the Download page's hero).
 */
export default function DesktopDownload({
  mac,
  winX64,
  winArm64,
  store,
  devices,
  variant = "primary",
  size = "md",
}: {
  mac: string;
  winX64: string;
  winArm64: string;
  store?: ReactNode;
  devices?: string;
  variant?: "primary" | "secondary";
  size?: "md" | "sm";
}) {
  const [arm, setArm] = useState(false);
  useEffect(() => {
    const hints = (navigator as Navigator & { userAgentData?: Hints }).userAgentData;
    void hints?.getHighEntropyValues?.(["architecture"]).then((v) => setArm(v.architecture === "arm"), () => undefined);
  }, []);

  const button = buttonClass(variant, size);
  return (
    <>
      {store && <span className="os-store">{store}</span>}
      {/* Each button is in the page for everyone and CSS shows the one that matches <html data-os>. */}
      <a href={mac} className={`os-mac ${button}`}>
        <span className="inline-flex items-center gap-2">
          Download for Mac <span aria-hidden>↓</span>
        </span>
      </a>
      <a href={arm ? winArm64 : winX64} className={`os-win ${button}`}>
        <span className="inline-flex items-center gap-2">
          Download for Windows{arm ? " (ARM64)" : ""} <span aria-hidden>↓</span>
        </span>
      </a>
      {devices && (
        <a href={devices} className={`os-other ${buttonClass("secondary", size)}`}>
          <span className="inline-flex items-center gap-2">
            See all downloads <span aria-hidden>↓</span>
          </span>
        </a>
      )}
    </>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faBullhorn, faCircleCheck, faTriangleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";

type Banner = { id: string; message: string; tone: string; link_label: string | null; link_href: string | null };

const TONE: Record<string, string> = {
  info: "bg-blue-bg text-blue-fg",
  success: "bg-green-bg text-green-fg",
  warning: "bg-amber-bg text-amber-fg",
};
const ICON = { info: faBullhorn, success: faCircleCheck, warning: faTriangleExclamation } as const;
const KEY = "naazhi.siteBanner.closed";

/**
 * The bar at the top of the public website. What it says, its colour and its link are set by an admin in Admin → Announcements (place it
 * "On the website"); this only shows the newest one. A visitor can close it, and it stays closed on this device until the admin
 * publishes a different one. Nothing is shown until the message has loaded, so a slow or failed request never leaves an empty bar.
 */
export default function SiteBanner() {
  const [b, setB] = useState<Banner | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/v1/site-banner")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { data: Banner | null } | null) => {
        if (!live || !j?.data) return;
        let closed = "";
        try {
          closed = localStorage.getItem(KEY) ?? "";
        } catch {
          /* storage unavailable: show it */
        }
        if (closed !== j.data.id) setB(j.data);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  if (!b) return null;
  const external = !!b.link_href && b.link_href.startsWith("https://");
  const close = () => {
    try {
      localStorage.setItem(KEY, b.id);
    } catch {
      /* it just shows again next visit */
    }
    setB(null);
  };
  return (
    <div role="region" aria-label="Announcement" className={`relative flex items-center justify-center gap-x-3 gap-y-1 px-12 py-2.5 text-center text-[14px] ${TONE[b.tone] ?? TONE.info}`}>
      <FA icon={ICON[b.tone as keyof typeof ICON] ?? faBullhorn} className="hidden shrink-0 sm:block" />
      <p className="m-0 [overflow-wrap:anywhere]">
        {b.message}
        {b.link_href && b.link_label && (
          <>
            {" "}
            <Link href={b.link_href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="font-semibold underline underline-offset-2">
              {b.link_label}
            </Link>
          </>
        )}
      </p>
      <button type="button" onClick={close} aria-label="Close announcement" className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-[12px] hover:bg-surface/50">
        <FA icon={faXmark} />
      </button>
    </div>
  );
}

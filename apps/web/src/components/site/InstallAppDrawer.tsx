"use client";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { GOOGLE_PLAY_URL } from "../../lib/site";
import { buttonClass } from "./ui";

const KEY = "naazhi.installDrawer.dismissedAt";
const SNOOZE_MS = 14 * 86_400_000;

const noop = () => () => {};

/** True on an Android phone in a normal browser tab, and not already inside the installed app or an installed web app. */
function wantsDrawer(): boolean {
  try {
    if (!/Android/i.test(navigator.userAgent) || !/Mobile/i.test(navigator.userAgent)) return false;
    if (window.matchMedia("(display-mode: standalone)").matches) return false;
    const at = Number(localStorage.getItem(KEY));
    return !at || Date.now() - at > SNOOZE_MS;
  } catch {
    return true;
  }
}

/**
 * A bottom drawer on the public site for people on an Android phone: "Get the Naazhi app", linking to Google Play. Closing it hides it
 * for two weeks. The server renders nothing (it can't know the device), so there is no hydration mismatch. There is no iPhone app, so
 * nothing is offered there.
 */
export default function InstallAppDrawer() {
  const eligible = useSyncExternalStore(noop, wantsDrawer, () => false);
  const [closed, setClosed] = useState(false);

  // Chrome fires this when the manifest points at the Play app (app/manifest.ts). Cancelling it stops Chrome's own install banner, so
  // the only install offer people see is this drawer, which goes to Google Play.
  useEffect(() => {
    const hide = (e: Event) => e.preventDefault();
    window.addEventListener("beforeinstallprompt", hide);
    return () => window.removeEventListener("beforeinstallprompt", hide);
  }, []);

  if (!eligible || closed) return null;

  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* not remembered */
    }
  };

  return (
    <aside
      role="complementary"
      aria-label="Get the Naazhi app"
      className="fixed inset-x-0 bottom-0 z-50 rounded-t-r4 bg-raised px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] shadow-pop ring-1 ring-line md:hidden"
    >
      <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-pill bg-line-2" />
      <div className="flex items-center gap-3">
        <Image src="/brand/icon-192.png" alt="" width={48} height={48} className="size-12 rounded-r2" />
        <div className="min-w-0 flex-1">
          <b className="block text-[16px] font-semibold text-fg">Get the Naazhi app</b>
          <span className="block text-[14px] text-fg-muted">Faster, works with widgets, free on Google Play.</span>
        </div>
        <button type="button" onClick={close} aria-label="Not now" className="grid size-9 place-items-center rounded-ctl text-fg-subtle hover:bg-hover">
          <FA icon={faXmark} />
        </button>
      </div>
      <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer" onClick={close} className={`${buttonClass("primary")} mt-3 w-full`}>
        Install from Google Play
      </a>
    </aside>
  );
}

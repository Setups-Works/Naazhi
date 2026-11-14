"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowRight, faCalendarDays, faDownload, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useComposioStatus, useImportGoogleCalendar } from "../../integrations/composio";

const KEY = "up_cal_banner_dismissed";

/**
 * Google Calendar on the Calendar page. Not connected: a nudge to connect it (stays dismissed once closed). Connected: a button that
 * imports every event of the main Google calendar into this calendar (again any time: events already imported are updated, not repeated).
 */
export default function ConnectCalendarBanner() {
  const status = useComposioStatus();
  const connected = status.data?.apps.some((a) => a.app === "googlecalendar" && a.state === "connected") ?? false;
  return connected ? <ImportGoogleCalendar /> : <Nudge />;
}

function ImportGoogleCalendar() {
  const run = useImportGoogleCalendar();
  const done = run.data;
  return (
    <aside
      aria-label="Google Calendar"
      className="mb-[18px] bg-side text-fg shadow-[inset_0_0_0_1px_var(--line)] flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-r3 px-4 py-3"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface/70 text-[14px]">
        <FA icon={faCalendarDays} />
      </span>
      <p className="min-w-0 flex-1 basis-60 text-[13.5px] leading-snug" role="status">
        <b className="font-semibold">{done ? `Imported ${done.count} ${done.count === 1 ? "event" : "events"} from Google Calendar.` : "Import your Google Calendar."}</b>{" "}
        <span className="opacity-80">
          {run.isError
            ? run.error.message
            : done?.truncated
              ? "That was the first 2,500 events (two years either side of today)."
              : done
                ? "They are in your calendar now. Import again any time to bring in new ones."
                : "Bring every event from two years back to two years ahead into this calendar."}
        </span>
      </p>
      <button
        type="button"
        onClick={() => run.mutate()}
        disabled={run.isPending}
        className="inline-flex h-9 items-center gap-2 rounded-pill bg-surface/80 px-4 text-[13.5px] font-medium shadow-e1 transition-colors hover:bg-surface disabled:opacity-60"
      >
        {run.isPending ? "Importing…" : done ? "Import again" : "Import"} <FA icon={faDownload} className="text-[11px]" />
      </button>
    </aside>
  );
}

function Nudge() {
  const [hidden, setHidden] = useState(() => {
    try {
      return window.localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* private mode: it just comes back next visit */
    }
  };
  return (
    <aside
      aria-label="Google Calendar"
      className="mb-[18px] bg-side text-fg shadow-[inset_0_0_0_1px_var(--line)] flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-r3 px-4 py-3"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface/70 text-[14px]">
        <FA icon={faCalendarDays} />
      </span>
      <p className="min-w-0 flex-1 basis-60 text-[13.5px] leading-snug">
        <b className="font-semibold">Bring in Google Calendar.</b>{" "}
        <span className="opacity-80">Connect it in Settings to see your events here and keep both in sync.</span>
      </p>
      <Link
        href="/dashboard/settings/google"
        className="inline-flex h-9 items-center gap-2 rounded-pill bg-surface/80 px-4 text-[13.5px] font-medium shadow-e1 transition-colors hover:bg-surface"
      >
        Connect <FA icon={faArrowRight} className="text-[11px]" />
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="grid size-8 place-items-center rounded-full text-[12px] hover:bg-surface/60"
      >
        <FA icon={faXmark} />
      </button>
    </aside>
  );
}

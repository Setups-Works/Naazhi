"use client";
import { useEffect, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faLightbulb, faXmark } from "@fortawesome/free-solid-svg-icons";
import { isoDate } from "../../lib/dates";
import { readPrefs } from "../../lib/prefs";

// Short, true hints about things the app already does. One shows per day, picked by the date.
const TIPS = [
  "Press Q on the To-do page to add a task without reaching for the mouse.",
  "Type “Call the bank tomorrow at 4pm p2” in a task box. The date and priority are picked out for you.",
  "Press ? on the To-do page to see every keyboard shortcut.",
  "Type / in a note to open the command menu for headings, lists and code blocks.",
  "Pin a note to keep it at the top of your Notes.",
  "Press Enter in the Journal to save an entry. Shift+Enter starts a new line.",
  "Switch the Journal to Calendar to see which days you wrote on.",
  "Group tasks by priority or date from the Group menu on the To-do page.",
];
const KEY = "up_tip_dismissed";

/** One short tip a day on Home. Hidden by the "Tips on Home" setting; closing it hides it until tomorrow. */
export default function HomeTip() {
  const [tip, setTip] = useState<string | null>(null);
  useEffect(() => {
    const day = isoDate();
    try {
      if (!readPrefs().homeTips || window.localStorage.getItem(KEY) === day) return;
    } catch {
      /* storage unavailable: show the tip */
    }
    const n = Math.floor(new Date(`${day}T12:00:00`).getTime() / 86_400_000);
    setTip(TIPS[n % TIPS.length]);
  }, []);
  if (!tip) return null;
  return (
    <p className="m-0 mt-4 flex items-start gap-2 rounded-r2 bg-hover px-3 py-2 text-[13.5px] text-fg-muted" role="note">
      <FA icon={faLightbulb} className="mt-[3px] text-[12px] text-fg-subtle" />
      <span className="flex-1">
        <b className="font-medium text-fg">Tip:</b> {tip}
      </span>
      <button
        type="button"
        className="ne-btn"
        aria-label="Hide today’s tip"
        onClick={() => {
          try {
            window.localStorage.setItem(KEY, isoDate());
          } catch {
            /* storage unavailable */
          }
          setTip(null);
        }}
      >
        <FA icon={faXmark} />
      </button>
    </p>
  );
}

"use client";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck } from "@fortawesome/free-solid-svg-icons";
import { ACCENTS, SCHEMES, type Accent, type Scheme } from "../../lib/prefs";

const SCHEME_LABEL: Record<Scheme, string> = { system: "System", light: "Light", cream: "Cream", dark: "Dark" };
const ACCENT_LABEL: Record<Accent, string> = {
  default: "Default",
  ocean: "Ocean",
  grove: "Grove",
  iris: "Iris",
  rose: "Rose",
  teal: "Teal",
  slate: "Slate",
};

/** A miniature of the app drawn in one scheme: rail, title bar and two cards. */
function Mini({ scheme }: { scheme: "light" | "cream" | "dark" }) {
  return (
    <div className={`scheme-light scheme-${scheme} flex h-full w-full overflow-hidden bg-paper`}>
      <div className="flex w-3.5 flex-col items-center gap-1 bg-side pt-1.5 shadow-[inset_-1px_0_0_var(--line)]">
        <i className="size-1.5 rounded-full bg-ink-4" />
        <i className="size-1.5 rounded-full bg-ink-4" />
        <i className="size-1.5 rounded-full bg-ink-4" />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <i className="h-1.5 w-1/2 rounded-full bg-ink" />
        <i className="h-1 w-1/3 rounded-full bg-ink-4" />
        <div className="mt-0.5 grid flex-1 grid-cols-[2fr_1fr] gap-1.5">
          <i className="rounded-[3px] bg-raised shadow-[inset_0_0_0_1px_var(--line-2)]" />
          <i className="rounded-[3px] bg-raised shadow-[inset_0_0_0_1px_var(--line-2)]" />
        </div>
      </div>
    </div>
  );
}

const CARD =
  "group flex flex-col gap-2 rounded-r3 p-1.5 pb-2.5 text-left text-[13px] text-fg transition-shadow duration-150 shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--line-3)] aria-checked:shadow-[inset_0_0_0_2px_var(--ink)]";

/** Colour scheme and accent, as the cards in Settings → Appearance. Saving is up to the caller (it stores both in preferences). */
export default function AppearancePicker({
  scheme,
  accent,
  onChange,
}: {
  scheme: Scheme;
  accent: Accent;
  onChange: (patch: { scheme?: Scheme; accent?: Accent }) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p id="ap-scheme" className="mb-2.5 text-[13.5px] font-medium text-fg">
          Color scheme
        </p>
        <div role="radiogroup" aria-labelledby="ap-scheme" className="grid grid-cols-4 gap-2.5 max-[560px]:grid-cols-2">
          {SCHEMES.map((s) => (
            <button key={s} type="button" role="radio" aria-checked={scheme === s} className={CARD} onClick={() => onChange({ scheme: s })}>
              <span className="block aspect-[16/10] overflow-hidden rounded-r1 shadow-[inset_0_0_0_1px_var(--line)]">
                {s === "system" ? (
                  <span className="grid h-full grid-cols-2">
                    <Mini scheme="light" />
                    <Mini scheme="dark" />
                  </span>
                ) : (
                  <Mini scheme={s} />
                )}
              </span>
              <span className="flex items-center justify-between px-1">
                {SCHEME_LABEL[s]}
                {scheme === s && <FA icon={faCheck} className="text-[11px]" />}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p id="ap-accent" className="mb-1 text-[13.5px] font-medium text-fg">
          Accent
        </p>
        <p className="mb-2.5 text-[13px] text-fg-subtle">Used for links, focus rings, progress and selected items.</p>
        <div role="radiogroup" aria-labelledby="ap-accent" className="grid grid-cols-4 gap-2.5 max-[560px]:grid-cols-2">
          {ACCENTS.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={accent === a}
              className={`${CARD} flex-row items-center gap-3 p-3`}
              onClick={() => onChange({ accent: a })}
            >
              <span className="flex -space-x-1.5" aria-hidden>
                <span data-accent={a} className="scheme-light size-5 rounded-full bg-accent shadow-[0_0_0_2px_var(--raised)]" />
                <span data-accent={a} className="scheme-light scheme-dark size-5 rounded-full bg-accent shadow-[0_0_0_2px_var(--raised)]" />
              </span>
              <span className="flex-1">{ACCENT_LABEL[a]}</span>
              {accent === a && <FA icon={faCheck} className="text-[11px]" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";
import type { ComponentProps, ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";
import type { Milestone } from "../../lib/onboarding";
import type { Prefs } from "../../lib/prefs";

/** What every screen of the flow can see and do. The shell owns it, so progress is saved in one place. */
export type Ctx = {
  first: string;
  display: string;
  setDisplay: (v: string) => void;
  /** The mobile number as typed; saved in international form once it is valid (needed on the About screen). */
  phone: string;
  setPhone: (v: string) => void;
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
  done: Milestone[];
  mark: (m: Milestone) => void;
  next: () => void;
  back: () => void;
  busy: boolean;
  err: string;
  setErr: (e: string) => void;
};

/** The heading of a screen. Each new screen moves focus here, so screen readers announce the step. */
export function Title({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1
      tabIndex={-1}
      className={cn("m-0 font-serif text-[clamp(28px,4.2vw,42px)] leading-[1.08] font-semibold tracking-[-0.03em] text-fg outline-none", className)}
    >
      {children}
    </h1>
  );
}

export const Lead = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn("m-0 mt-3 max-w-[560px] text-[16.5px] leading-relaxed text-fg-muted", className)}>{children}</p>
);

/** The small grey "Soon" label: a feature that is planned but not built yet is always marked, never faked. */
export const Soon = () => <span className="rounded-pill bg-hover px-2.5 py-0.5 text-[12.5px] font-medium text-ink-2">Soon</span>;

/** A bordered row or card, the one surface of this flow. */
export const Card = ({ className, ...rest }: ComponentProps<"div">) => <div className={cn("rounded-r3 border bg-raised", className)} {...rest} />;

/** A tinted square for an icon or a letter. */
export const Tile = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-r2 bg-hover text-[16px] text-ink-2", className)}>
    {children}
  </span>
);

/**
 * The bottom row of a screen: "Skip for now" moves on without saving anything from this screen; Continue is the main action.
 * Back sits first so the flow can always be walked backwards.
 */
export function Actions({
  ctx,
  label = "Continue",
  onContinue,
  disabled,
  hideSkip,
  hideBack,
  note,
}: {
  ctx: Ctx;
  label?: string;
  onContinue?: () => void;
  disabled?: boolean;
  hideSkip?: boolean;
  hideBack?: boolean;
  note?: ReactNode;
}) {
  return (
    <div className="mt-7">
      <div className="flex flex-wrap items-center gap-3">
        {!hideBack && (
          <button type="button" className="btn btn-secondary" onClick={ctx.back}>
            Back
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={onContinue ?? ctx.next} disabled={disabled || ctx.busy}>
          {label} <FA icon={faArrowRight} />
        </button>
        {!hideSkip && (
          <button type="button" className="cursor-pointer rounded-ctl px-3 py-2 text-[15px] text-fg-muted hover:text-fg" onClick={ctx.next}>
            Skip for now
          </button>
        )}
      </div>
      {note && <p className="m-0 mt-3 max-w-[620px] text-[14px] leading-relaxed text-fg-subtle">{note}</p>}
      {ctx.err && (
        <p className="form-err" role="alert">
          {ctx.err}
        </p>
      )}
    </div>
  );
}

/** A segmented control for choosing one of a few options (kept from the old setup for the preferences screen). */
export function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2">
      <span className="text-[14px] font-medium text-fg">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={pill(value === v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A pill button, selected or not. */
export const pill = (on: boolean) =>
  cn(
    "cursor-pointer rounded-r2 border px-4 py-2 text-[15px] transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
    on ? "border-fg bg-fill-dark text-on-dark" : "bg-raised text-ink-2 hover:bg-hover hover:text-fg",
  );

/** A text field with a label above it. */
export const fieldClass =
  "h-12 w-full rounded-r2 border bg-raised px-4 text-[16px] text-fg outline-none placeholder:text-fg-faint focus-visible:border-line-strong focus-visible:ring-[3px] focus-visible:ring-ring/30";

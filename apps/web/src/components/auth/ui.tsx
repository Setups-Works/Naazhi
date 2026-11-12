import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { buttonClass } from "../site/ui";

/** The pieces the sign-in pages are made of, in the site's look: pill fields, pill buttons, brand-green links and chips. */

export const inputCls =
  "h-12 w-full appearance-none rounded-pill border-0 bg-surface px-5 text-[15px] text-fg ring-1 ring-line-strong outline-none transition-shadow placeholder:text-fg-faint focus:ring-2 focus:ring-green-fg disabled:opacity-60";

/** A labelled field. `aside` sits at the right end of the label row (a "Last used" chip, a "Forgot password?" link). */
export function Field({ label, aside, hint, children }: { label: ReactNode; aside?: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center justify-between gap-3 text-[13.5px] font-medium text-fg">
        <span>{label}</span>
        {aside}
      </span>
      {children}
      {hint ? <small className="text-[12.5px] leading-snug text-fg-subtle">{hint}</small> : null}
    </label>
  );
}

export function TextInput(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function PrimaryButton({ children, ...rest }: ComponentProps<"button">) {
  return (
    <button {...rest} className={`${buttonClass("primary")} w-full disabled:opacity-60`}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, ...rest }: ComponentProps<"button">) {
  return (
    <button {...rest} className={`${buttonClass("secondary")} relative w-full disabled:opacity-60`}>
      {children}
    </button>
  );
}

export const linkCls = "font-medium text-green-fg underline-offset-4 hover:underline";

export function TextLink({ href, children }: { href: "/login" | "/signup" | "/forgot-password"; children: ReactNode }) {
  return (
    <Link href={href} className={linkCls}>
      {children}
    </Link>
  );
}

export function LastUsed() {
  return <small className="rounded-pill bg-green-bg px-2 py-0.5 text-[11px] leading-tight font-semibold text-green-fg">Last used</small>;
}

/** The "or" rule between the one-tap buttons and the form. */
export function Or() {
  return (
    <div className="flex items-center gap-4 text-[12.5px] text-fg-faint" aria-hidden>
      <i className="h-px flex-1 bg-line" />
      or
      <i className="h-px flex-1 bg-line" />
    </div>
  );
}

const BAR = ["", "bg-clay-fg", "bg-amber-fg", "bg-green-fg/70", "bg-green-fg"];

/** Four bars that fill as the password gets stronger, with its word beside them. */
export function Meter({ score, label }: { score: number; label: string }) {
  return (
    <span className="mt-1 flex items-center gap-1.5" role="status" aria-label={`Password strength: ${label}`}>
      {[1, 2, 3, 4].map((n) => (
        <i
          key={n}
          className={`h-1.5 flex-1 rounded-pill transition-colors duration-300 ${n <= score ? BAR[score] : "bg-surface-sunken"}`}
        />
      ))}
      <small className="ml-1.5 min-w-14 text-[12px] text-fg-subtle">{label}</small>
    </span>
  );
}

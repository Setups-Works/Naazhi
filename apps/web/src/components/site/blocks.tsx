import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon as FA } from "@fortawesome/react-fontawesome";
import { faCheck, faMinus } from "@fortawesome/free-solid-svg-icons";
import { R, Reveal } from "./Reveal";
import { IconBadge, Surface } from "./ui";

/** Numbered steps as cards: the number large and pale, a title, a sentence and a few ticks. */
export function StepCards({ steps }: { steps: readonly { icon: IconDefinition; t: string; d: string; pts: readonly string[] }[] }) {
  return (
    <Reveal stagger={0.1} className="mt-[clamp(28px,4vw,52px)] grid gap-4 md:grid-cols-2">
      {steps.map((s, n) => (
        <R key={s.t}>
          <Surface lift className="flex h-full flex-col gap-3 p-6 sm:p-8">
            <div className="flex items-start justify-between">
              <IconBadge icon={s.icon} className="size-12" />
              <span className="font-serif text-[56px] leading-none tracking-[-0.04em] text-green-fg/20">{String(n + 1).padStart(2, "0")}</span>
            </div>
            <h3 className="font-serif text-[28px] leading-tight tracking-[-0.022em]">{s.t}</h3>
            <p className="text-[15.5px] leading-relaxed text-fg-muted">{s.d}</p>
            <ul className="mt-1 flex flex-col gap-2">
              {s.pts.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-[14.5px] text-fg">
                  <FA icon={faCheck} className="text-[12px] text-green-fg" />
                  {p}
                </li>
              ))}
            </ul>
          </Surface>
        </R>
      ))}
    </Reveal>
  );
}

/** A day told in moments, each with its time. */
export function DayTimeline({ moments }: { moments: readonly { time: string; icon: IconDefinition; t: string; d: string }[] }) {
  return (
    <Reveal stagger={0.1} className="mt-[clamp(28px,4vw,52px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {moments.map((m) => (
        <R key={m.t}>
          <Surface lift className="flex h-full flex-col gap-3 p-6">
            <div className="flex items-center justify-between">
              <IconBadge icon={m.icon} />
              <span className="font-mono text-[13px] text-green-fg">{m.time}</span>
            </div>
            <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-fg">{m.t}</h3>
            <p className="text-[14.5px] leading-relaxed text-fg-muted">{m.d}</p>
          </Surface>
        </R>
      ))}
    </Reveal>
  );
}

/** Who can see what: one row per kind of data. */
export function AccessMatrix({ rows }: { rows: { what: string; who: string; note: string }[] }) {
  return (
    <Reveal className="mt-[clamp(28px,4vw,52px)]">
      <Surface className="overflow-hidden">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Who can see what</caption>
          <thead>
            <tr className="bg-surface-muted/60 text-[11px] font-semibold tracking-[0.1em] text-fg-faint uppercase">
              <th scope="col" className="px-5 py-4 sm:px-6">
                What
              </th>
              <th scope="col" className="px-5 py-4 sm:px-6">
                Who can see it
              </th>
              <th scope="col" className="hidden px-5 py-4 sm:table-cell sm:px-6">
                Good to know
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.what} className="border-t border-line align-top transition-colors hover:bg-green-bg/30">
                <th scope="row" className="px-5 py-4 text-[15px] font-medium text-fg sm:px-6">
                  {r.what}
                </th>
                <td className="px-5 py-4 text-[15px] text-green-fg sm:px-6">{r.who}</td>
                <td className="hidden px-5 py-4 text-[14.5px] leading-relaxed text-fg-muted sm:table-cell sm:px-6">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
    </Reveal>
  );
}

/** Plan comparison: `true` is a tick, `false` a dash, a string is shown as is. */
export function CompareTable({ plans, rows }: { plans: string[]; rows: { label: string; values: (boolean | string)[] }[] }) {
  const cell = (v: boolean | string) =>
    typeof v === "string" ? (
      <span className="text-[14.5px] font-medium text-fg">{v}</span>
    ) : v ? (
      <>
        <FA icon={faCheck} className="text-green-fg" aria-hidden />
        <span className="sr-only">Included</span>
      </>
    ) : (
      <>
        <FA icon={faMinus} className="text-fg-faint" aria-hidden />
        <span className="sr-only">Not included</span>
      </>
    );
  return (
    <Reveal className="mt-[clamp(28px,4vw,52px)]">
      <Surface className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <caption className="sr-only">Compare plans</caption>
          <thead>
            <tr className="bg-surface-muted/60">
              <th scope="col" className="px-5 py-4 sm:px-6">
                <span className="sr-only">Feature</span>
              </th>
              {plans.map((p) => (
                <th key={p} scope="col" className="px-4 py-4 text-center font-serif text-[22px] font-normal tracking-[-0.02em]">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line transition-colors hover:bg-green-bg/30">
                <th scope="row" className="px-5 py-3.5 text-[15px] font-normal text-fg sm:px-6">
                  {r.label}
                </th>
                {plans.map((p, i) => (
                  <td key={p} className="px-4 py-3.5 text-center">
                    {cell(r.values[i] ?? false)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
    </Reveal>
  );
}

import type { ReactNode } from "react";
import type { Series } from "../../server/services/admin/analytics";

/** Small presentational blocks for Admin → Analytics: flat hairline cards, token colours, no libraries. */

const nf = new Intl.NumberFormat("en-IN");
export const num = (n: number) => nf.format(n);
const short = (n: number) => (n >= 100_000 ? new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n) : nf.format(n));

export function Card({ title, note, right, children }: { title: string; note?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-r3 bg-raised p-5 shadow-[inset_0_0_0_1px_var(--line)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] leading-tight font-semibold text-fg">{title}</h2>
          {note && <p className="mt-1 text-[12.5px] text-fg-subtle">{note}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-r3 bg-raised p-4 shadow-[inset_0_0_0_1px_var(--line)]">
      <div className="text-[28px] leading-none font-semibold tracking-[-0.025em] text-fg">{short(value)}</div>
      <div className="mt-2 text-[12.5px] text-fg-muted">{label}</div>
      {hint && <div className="mt-0.5 text-[12px] text-fg-faint">{hint}</div>}
    </div>
  );
}

/** One bar per day. Several series stack (first one on top); `legend` names them in the same order. */
export function DayChart({ label, series, legend }: { label: string; series: Series[]; legend?: string[] }) {
  const days = series[0]?.length ?? 0;
  const totals = Array.from({ length: days }, (_, i) => series.reduce((a, s) => a + (s[i]?.n ?? 0), 0));
  const max = Math.max(1, ...totals);
  const dots = ["bg-(--data)", "bg-ink-3", "bg-green-fg"];
  const dateAt = (i: number) => series[0]?.[i]?.label ?? "";
  const empty = totals.every((t) => t === 0);
  return (
    <div>
      {legend && (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-fg-muted">
          {legend.map((l, i) => (
            <span key={l} className="inline-flex items-center gap-1.5">
              <i className={`size-2 rounded-full ${dots[i]}`} /> {l}
            </span>
          ))}
        </div>
      )}
      <div
        role="img"
        aria-label={`${label}: highest ${num(max)} in a day, ${num(totals.reduce((a, b) => a + b, 0))} in total`}
        className="relative flex h-[132px] items-end gap-[2px] border-b border-line"
      >
        {empty && <span className="absolute inset-0 grid place-items-center text-[12.5px] text-fg-faint">Nothing in this period yet.</span>}
        {totals.map((t, i) => (
          <div key={i} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${dateAt(i)}: ${num(t)}`}>
            {t === 0 ? (
              <i className="h-[2px] rounded-full bg-line-2" />
            ) : (
              series.map((s, k) => {
                const v = s[i]?.n ?? 0;
                return v ? <i key={k} className={`block w-full first:rounded-b-none last:rounded-t-[3px] ${dots[k] ?? dots[0]} group-hover:opacity-80`} style={{ height: `${(v / max) * 100}%` }} /> : null;
              })
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11.5px] text-fg-faint">
        <span>{dateAt(0)}</span>
        <span>{dateAt(Math.floor(days / 2))}</span>
        <span>{dateAt(days - 1)}</span>
      </div>
      <div className="mt-2 text-[11.5px] text-fg-faint">Highest day: {num(max)}</div>
    </div>
  );
}

/** Rows with a thin bar showing each item's share of `of` (defaults to the sum). */
export function Breakdown({ data, of, empty = "Nothing yet." }: { data: Series; of?: number; empty?: string }) {
  const total = of ?? (data.reduce((a, d) => a + d.n, 0) || 1);
  if (!data.length) return <p className="text-[13px] text-fg-faint">{empty}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {data.map((d) => {
        const pct = Math.min(100, Math.round((d.n / (total || 1)) * 100));
        return (
          <li key={d.label}>
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="min-w-0 truncate text-fg">{d.label}</span>
              <span className="shrink-0 text-fg-muted tabular-nums">
                {num(d.n)} <span className="text-fg-faint">· {pct}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hover" role="presentation">
              <div className="h-full rounded-full bg-(--data)" style={{ width: `${Math.max(pct, d.n > 0 ? 2 : 0)}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

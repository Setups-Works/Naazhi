const SIZE = 200;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/** A progress ring with the percentage in the middle. `fraction` is 0–1 (the arc), `label`/`detail` sit under the number. */
export default function WeeklyRing({ fraction, label, detail }: { fraction: number; label: string; detail: string }) {
  return (
    <div className="relative mx-auto grid size-[200px] place-items-center" role="img" aria-label={`${label}: ${Math.round(fraction * 100)}%. ${detail}`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" strokeWidth={STROKE} className="stroke-hover" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fraction)}
          className="stroke-ink transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div className="relative text-center">
        <p className="m-0 text-[12px] font-medium text-ink-3">{label}</p>
        <p className="m-0 text-[44px] leading-none font-semibold tracking-[-0.03em]">{Math.round(fraction * 100)}%</p>
        <p className="m-0 mt-1 text-[13px] text-ink-3">{detail}</p>
      </div>
    </div>
  );
}

import { R, Reveal } from "./Reveal";

/**
 * Questions and answers as native disclosure rows: one hairline between them, a plus that turns into a minus, and no script at all,
 * so they open with the keyboard and work without JavaScript.
 */
export function FaqList({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <Reveal stagger={0.05} className="divide-y divide-line border-y border-line">
      {items.map(([q, a]) => (
        <R key={q}>
          <details className="group py-1">
            <summary className="flex cursor-pointer list-none items-center gap-4 py-4 text-left [&::-webkit-details-marker]:hidden">
              <span className="flex-1 text-[17px] font-medium tracking-[-0.01em] text-fg">{q}</span>
              <span aria-hidden className="relative size-6 shrink-0">
                <i className="absolute top-1/2 left-1/2 h-px w-3.5 -translate-x-1/2 bg-fg" />
                <i className="absolute top-1/2 left-1/2 h-px w-3.5 -translate-x-1/2 rotate-90 bg-fg transition-transform duration-300 group-open:rotate-0 motion-reduce:transition-none" />
              </span>
            </summary>
            <p className="max-w-[680px] pr-10 pb-5 text-[15.5px] leading-relaxed text-fg-muted">{a}</p>
          </details>
        </R>
      ))}
    </Reveal>
  );
}

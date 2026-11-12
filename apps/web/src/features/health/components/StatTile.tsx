import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Icon as FA } from "@/components/ui/Icon";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

/** One metric as a flat card: icon tile, label, value, an optional note and a goal bar. A tile with no value reads "No data". */
export default function StatTile({
  icon,
  label,
  value,
  note,
  fill,
  href,
  heart,
}: {
  icon: IconDefinition;
  label: string;
  value: string | null;
  note?: string;
  /** 0–1: progress toward the goal, drawn as a thin bar under the value. */
  fill?: number;
  /** Opens the metric's detail page. */
  href?: string;
  /** Draws Naazhi's pink heart instead of the line icon (the heart-rate tile). */
  heart?: boolean;
}) {
  const cls = "relative flex items-center gap-3 rounded-r3 border bg-paper p-3.5";
  const inner = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-r2 border text-[16px] text-ink-2">
        {heart ? (
          // eslint-disable-next-line @next/next/no-img-element -- a small fixed picture
          <img src="/brand/health-heart.png" alt="" width={64} height={64} aria-hidden className="size-5 object-contain" />
        ) : (
          <FA icon={icon} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[13px] leading-tight text-ink-3">{label}</p>
        <p className="m-0 text-[24px] leading-[1.15] font-semibold tracking-[-0.02em]">{value ?? "No data"}</p>
        {note && <p className="m-0 text-[12.5px] leading-tight text-ink-3">{note}</p>}
        {fill !== undefined && (
          <span aria-hidden className="mt-2 block h-1 overflow-hidden rounded-pill bg-hover">
            <span className="block h-full rounded-pill bg-ink" style={{ width: `${Math.round(fill * 100)}%` }} />
          </span>
        )}
      </div>
      {href && <FA icon={faChevronRight} aria-hidden className="text-[12px] text-ink-4" />}
    </>
  );
  return href ? (
    <Link href={href} className={`${cls} transition-colors hover:bg-hover motion-reduce:transition-none`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

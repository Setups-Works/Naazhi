import { Icon as FA } from "@/components/ui/Icon";
import { faCircleExclamation, faCircleInfo } from "@fortawesome/free-solid-svg-icons";
import type { Block } from "../../features/help/types";

/** An article's body: paragraphs, subheadings, numbered steps, lists and notes, in the site's reading style. */
export default function ArticleBody({ blocks }: { blocks: readonly Block[] }) {
  return (
    <div className="flex flex-col gap-5 text-[16.5px] leading-[1.7] text-fg-muted">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "p":
            return <p key={i}>{b.text}</p>;
          case "h":
            return (
              <h2 key={i} className="mt-4 font-serif text-[26px] leading-tight font-semibold tracking-[-0.02em] text-fg">
                {b.text}
              </h2>
            );
          case "steps":
            return (
              <ol key={i} className="flex flex-col gap-3">
                {b.items.map((s, n) => (
                  <li key={s} className="flex gap-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-green-bg text-[14px] font-semibold text-green-fg tabular-nums">{n + 1}</span>
                    <span className="pt-0.5 text-fg">{s}</span>
                  </li>
                ))}
              </ol>
            );
          case "list":
            return (
              <ul key={i} className="flex list-disc flex-col gap-2 pl-5 marker:text-fg-faint">
                {b.items.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            );
          case "note":
            return (
              <aside
                key={i}
                className={`flex gap-3 rounded-r3 px-4 py-3.5 text-[15px] leading-relaxed ring-1 ${b.tone === "warn" ? "bg-amber-bg text-fg ring-amber-fg/20" : "bg-green-bg/60 text-fg ring-green-fg/15"}`}
              >
                <FA icon={b.tone === "warn" ? faCircleExclamation : faCircleInfo} className={`mt-1 shrink-0 text-[14px] ${b.tone === "warn" ? "text-amber-fg" : "text-green-fg"}`} />
                <p>{b.text}</p>
              </aside>
            );
        }
      })}
    </div>
  );
}

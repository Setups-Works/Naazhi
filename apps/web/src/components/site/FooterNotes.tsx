"use client";
import { usePathname } from "next/navigation";
import { internalPath } from "../../lib/hosts";
import { notesForPath } from "./disclaimers";

/** The numbered notes in the footer. Client-side only because the notes depend on the page being shown (see disclaimers.ts). */
export default function FooterNotes() {
  const notes = notesForPath(internalPath(usePathname()));
  return (
    <section id="notes" aria-labelledby="notes-title" className="mt-10 border-t border-line pt-6">
      <h2 id="notes-title" className="m-0 mb-3 text-[12px] font-semibold text-fg">
        Notes
      </h2>
      <ol className="m-0 grid list-none gap-2 p-0 text-[12.5px] leading-relaxed text-fg-subtle sm:grid-cols-2">
        {notes.map((text, i) => (
          <li key={text} id={`note-${i + 1}`} className="flex scroll-mt-24 gap-2 rounded-r1 target:bg-surface-sunken target:text-fg">
            <span className="shrink-0 font-medium tabular-nums">{i + 1}.</span>
            <span>{text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

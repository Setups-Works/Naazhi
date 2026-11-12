import { DISCLAIMERS } from "./disclaimers";

/** A small numbered marker that links to that note in the footer (see disclaimers.ts). Put it right after the words the note is about. */
export default function NoteRef({ n, dark = false }: { n: 1 | 2 | 3 | 4; /** On an ink panel. */ dark?: boolean }) {
  return (
    <sup className="ml-0.5 text-[0.7em] font-medium">
      <a
        href={`#note-${n}`}
        aria-label={`Note ${n}: ${DISCLAIMERS[n - 1]}`}
        className={`underline-offset-2 hover:underline ${dark ? "text-on-dark/70 hover:text-on-dark" : "text-fg-muted hover:text-fg"}`}
      >
        {n}
      </a>
    </sup>
  );
}

import { ALL_MENTIONS } from "../../../../lib/connectors";

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
// "@Zoho Books" and the like: drawn with the app's logo before the @, in a small chip.
const MENTION_RE = new RegExp(`(@(?:${ALL_MENTIONS.map((c) => c.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
const LOGO = new Map(ALL_MENTIONS.map((c) => [`@${c.label}`, c.logo]));
const TRAILING = /[).,;:!?]+$/;

/** A person's plain message with its web addresses turned into links that open in a new tab. Everything else stays text. */
export default function ChatTokenizedText({ text }: { text: string }) {
  return (
    <p>
      {text.split(URL_RE).map((part, i) => {
        if (i % 2 === 0)
          return part.split(MENTION_RE).map((piece, j) =>
            LOGO.has(piece) ? (
              <span key={`${i}-${j}`} className="mx-0.5 inline-flex items-center gap-1 rounded-ctl px-1.5 py-px align-baseline bg-[color-mix(in_srgb,currentColor_16%,transparent)] text-[0.95em]">
                <span className="grid size-4 place-items-center rounded-[4px] bg-paper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={LOGO.get(piece)} alt="" width={12} height={12} className="object-contain" />
                </span>
                {piece}
              </span>
            ) : (
              piece
            ),
          );
        const tail = TRAILING.exec(part)?.[0] ?? "";
        const url = tail ? part.slice(0, -tail.length) : part;
        return (
          <span key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {url}
            </a>
            {tail}
          </span>
        );
      })}
    </p>
  );
}

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
const TRAILING = /[).,;:!?]+$/;

/** A person's plain message with its web addresses turned into links that open in a new tab. Everything else stays text. */
export default function ChatTokenizedText({ text }: { text: string }) {
  return (
    <p>
      {text.split(URL_RE).map((part, i) => {
        if (i % 2 === 0) return part;
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

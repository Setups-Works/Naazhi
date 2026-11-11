"use client";
import { useMemo, useState, type ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";

/** Code over this many lines starts collapsed, with "Show all N lines" under it. */
const COLLAPSE_AT = 14;

const KEYWORDS = new Set(
  `abstract and as async await break case catch class const continue def default del delete do elif else enum except export extends false finally for from function if implements import in interface is lambda let namespace new nil none not null of or override pass private protected public raise readonly return static struct switch this throw true try type typeof using var void while with yield`.split(" "),
);
const TYPES = new Set("int long short byte float double decimal bool boolean char string object number any unknown never str dict list tuple set".split(" "));
/** Languages whose comments start with a hash. */
const HASH_COMMENTS = new Set(["python", "py", "bash", "sh", "shell", "zsh", "yaml", "yml", "ruby", "rb", "toml", "dockerfile"]);

// Groups: 1 comment, 2 string, 3 number, 4 word. Literals (not strings) so the backtick string case needs no escaping.
const PLAIN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d[\d_.]*(?:[eE][+-]?\d+)?\b)|([A-Za-z_]\w*)/g;
const WITH_HASH = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d[\d_.]*(?:[eE][+-]?\d+)?\b)|([A-Za-z_]\w*)/g;

/** A small tokenizer for C-like, Python and shell code: enough to colour comments, strings, numbers, keywords and types. */
function highlight(source: string, lang: string): ReactNode[] {
  const hash = HASH_COMMENTS.has(lang.toLowerCase());
  const re = new RegExp(hash ? WITH_HASH : PLAIN);
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    if (m.index > last) out.push(source.slice(last, m.index));
    const [text, comment, str, num, word] = m;
    let cls = "";
    if (comment) cls = "cb-c";
    else if (str) cls = "cb-s";
    else if (num) cls = "cb-n";
    else if (word) cls = KEYWORDS.has(word.toLowerCase()) && word === word.toLowerCase() ? "cb-k" : TYPES.has(word) || /^[A-Z][a-z]\w*$/.test(word) ? "cb-t" : "";
    out.push(cls ? <span key={m.index} className={cls}>{text}</span> : text);
    last = m.index + text.length;
  }
  if (last < source.length) out.push(source.slice(last));
  return out;
}

/** A fenced code block: language label and a copy button on top, long code collapsed, with light syntax colours. */
export default function CodeBlock({ lang, source }: { lang?: string; source: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const colored = useMemo(() => highlight(source, lang ?? ""), [source, lang]);
  const lines = source.replace(/\n$/, "").split("\n").length;
  const long = lines > COLLAPSE_AT;

  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }

  return (
    <div className="cb" data-collapsed={long && !open}>
      <div className="cb-h">
        <span>{lang || "text"}</span>
        <button type="button" onClick={copy} aria-label={copied ? "Copied" : "Copy code"} title="Copy code">
          <FA icon={copied ? faCheck : faCopy} />
        </button>
      </div>
      <pre>
        <code>{colored}</code>
      </pre>
      {long && (
        <button type="button" className="cb-more" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Show less" : `Show all ${lines} lines`}
        </button>
      )}
    </div>
  );
}

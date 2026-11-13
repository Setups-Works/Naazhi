"use client";
import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { categoryBySlug } from "../../features/help/articles";
import { searchArticles } from "../../features/help/search";
import { helpHref } from "../../lib/hosts";

/**
 * The help search box. It answers as you type (the articles are plain data, so there is nothing to wait for), arrow keys move through the
 * results, and Enter on nothing selected goes to the full results page. Works without script too: it is a real GET form.
 */
export default function HelpSearch({ size = "lg", placeholder = "Search for help, for example “reset password”" }: { size?: "lg" | "sm"; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef<HTMLFormElement>(null);
  const listId = useId();
  const results = useMemo(() => searchArticles(q, 6), [q]);
  const show = open && q.trim().length > 1;

  const go = (i: number) => {
    const a = results[i];
    if (a) window.location.assign(helpHref(`/${a.category}/${a.slug}`));
  };

  return (
    <form
      ref={root}
      role="search"
      action={helpHref("/search")}
      method="get"
      className="relative w-full"
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
      onSubmit={(e) => {
        if (active >= 0) {
          e.preventDefault();
          go(active);
        }
      }}
    >
      <label htmlFor={`${listId}-q`} className="sr-only">
        Search the help center
      </label>
      <div
        className={`flex items-center gap-3 rounded-pill bg-surface ring-1 ring-line-strong transition-shadow focus-within:ring-2 focus-within:ring-fg ${size === "lg" ? "h-14 px-6" : "h-10 px-4"}`}
      >
        <FA icon={faMagnifyingGlass} className="shrink-0 text-[15px] text-fg-subtle" />
        <input
          id={`${listId}-q`}
          name="q"
          type="search"
          autoComplete="off"
          value={q}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, -1));
            } else if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
          }}
          className={`min-w-0 flex-1 appearance-none border-0 bg-transparent p-0 font-sans text-fg shadow-none outline-none focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:appearance-none placeholder:text-fg-faint ${size === "lg" ? "text-[17px]" : "text-[14.5px]"}`}
        />
      </div>
      {show && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-r4 bg-surface text-left ring-1 ring-line-strong">
          {results.length === 0 ? (
            <p className="px-5 py-4 text-[14.5px] text-fg-muted">
              Nothing found for “{q.trim()}”. Try fewer words, or{" "}
              <Link className="text-green-fg underline underline-offset-2" href={helpHref("/troubleshooting")}>
                browse troubleshooting
              </Link>
              .
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Matching articles" className="divide-y divide-line">
              {results.map((a, i) => (
                <li key={a.slug} id={`${listId}-${i}`} role="option" aria-selected={active === i}>
                  <Link
                    href={helpHref(`/${a.category}/${a.slug}`)}
                    className={`block px-5 py-3 transition-colors hover:bg-surface-muted ${active === i ? "bg-surface-muted" : ""}`}
                  >
                    <span className="block text-[15px] font-medium text-fg">{a.title}</span>
                    <span className="block text-[12.5px] text-fg-subtle">{categoryBySlug(a.category)?.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}

"use client";
import { useMemo, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { Checkbox } from "../ui/checkbox";

export type Person = { id: string; email: string; name: string };

/** A searchable list of users with a checkbox each. Nothing picked means everyone, and the line above the list says so. */
export default function RecipientPicker({ people, picked, onChange }: { people: Person[]; picked: Set<string>; onChange: (next: Set<string>) => void }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? people.filter((p) => p.email.toLowerCase().includes(t) || p.name.toLowerCase().includes(t)) : people;
  }, [people, q]);
  const allShownPicked = shown.length > 0 && shown.every((p) => picked.has(p.id));

  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };
  const toggleShown = () => {
    const next = new Set(picked);
    for (const p of shown) {
      if (allShownPicked) next.delete(p.id);
      else next.add(p.id);
    }
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13.5px] text-fg-muted" aria-live="polite">
          {picked.size ? `${picked.size} of ${people.length} picked` : `No one picked: it goes to all ${people.length} users`}
        </span>
        <span className="flex gap-3 text-[13px]">
          <button type="button" className="text-green-fg underline underline-offset-2 disabled:opacity-50" onClick={toggleShown} disabled={!shown.length}>
            {allShownPicked ? "Unpick" : "Pick"} {q.trim() ? "these" : "all"}
          </button>
          {picked.size > 0 && (
            <button type="button" className="text-fg-muted underline underline-offset-2" onClick={() => onChange(new Set())}>
              Clear
            </button>
          )}
        </span>
      </div>
      <label className="relative block">
        <FA icon={faMagnifyingGlass} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[13px] text-fg-subtle" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search users"
          className="!pl-10"
        />
      </label>
      <ul className="m-0 max-h-[260px] list-none overflow-y-auto rounded-r2 border border-line bg-paper p-1" aria-label="Users">
        {shown.length === 0 && <li className="px-3 py-4 text-[14px] text-fg-muted">No one matches “{q.trim()}”.</li>}
        {shown.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-r1 px-3 py-2 hover:bg-hover">
              <Checkbox checked={picked.has(p.id)} onCheckedChange={() => toggle(p.id)} aria-label={`Pick ${p.name || p.email}`} />
              <span className="min-w-0 flex-1 truncate text-[14px] text-fg">
                {p.name ? (
                  <>
                    {p.name} <span className="text-fg-muted">· {p.email}</span>
                  </>
                ) : (
                  p.email
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

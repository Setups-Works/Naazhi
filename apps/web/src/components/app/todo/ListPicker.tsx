"use client";
import { useState, type ReactNode } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck, faHashtag, faInbox, faPlus } from "@fortawesome/free-solid-svg-icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { TaskList } from "../../../lib/workspace";

/**
 * "Inbox ▾" (reference: todo-05): a search box that doubles as "type a name to make a list", and the lists with a tick on the
 * current one. `children` is the button that opens it.
 */
export default function ListPicker({
  lists,
  value,
  onChange,
  onCreate,
  children,
}: {
  lists: TaskList[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Make a list with this name and resolve to its id. */
  onCreate: (name: string) => Promise<string | undefined>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const name = q.trim();
  const exists = lists.some((l) => l.name.toLowerCase() === name.toLowerCase()) || "inbox" === name.toLowerCase();

  const choose = (id: string | null) => {
    onChange(id);
    setOpen(false);
    setQ("");
  };
  async function create() {
    const id = await onCreate(name.slice(0, 60));
    if (id) choose(id);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="lp w-[300px] p-0">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder="Type a list name" />
          <CommandList>
            {[{ id: "", name: "Inbox" }, ...lists]
              .filter((l) => !name || l.name.toLowerCase().includes(name.toLowerCase()))
              .map((l) => (
                <CommandItem key={l.id || "inbox"} value={l.id || "inbox"} onSelect={() => choose(l.id || null)}>
                  <FA icon={l.id ? faHashtag : faInbox} /> <span className="flex-1">{l.name}</span>
                  {(value ?? "") === l.id && <FA icon={faCheck} />}
                </CommandItem>
              ))}
            {name && !exists && (
              <CommandItem value={`create-${name}`} onSelect={create}>
                <FA icon={faPlus} /> <span className="flex-1">Create “{name}”</span>
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

"use client";
import { useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import { faCheck, faChevronDown, faKey } from "@fortawesome/free-solid-svg-icons";
import { chatgptChoice, ownChoice } from "@untitled/logic/aiConnections";
import type { Provider } from "../../../lib/ai";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { ProviderLogo } from "../../ui/ProviderLogo";
import { useAiCatalog } from "../../../features/ai/connections";
import { BrandMark } from "../../BrandMark";
import ConnectAiDialog from "./ConnectAiDialog";

type Row = { id: string; label: string; note: string; logo: string; action?: "connect" | "key"; available: boolean };

/**
 * The model picker: one list grouped by provider. Models you can use are selectable (a tick marks the current one); the others carry a
 * "Connect" (ChatGPT) or "Add key" button that opens the connect dialog. Models come from the server's catalog, nothing is hard-coded here.
 */
export default function ModelPicker({ providers, current, onSelect }: { providers: Provider[]; current: Provider; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<null | "chatgpt" | "keys">(null);
  const catalog = useAiCatalog().data;

  const groups: { label: string; id: string; rows: Row[] }[] = [];
  for (const g of catalog?.groups ?? []) {
    // A provider you haven't connected shows a few of its models, each asking to be connected; a connected one lists all of them.
    const models = g.connected ? g.models : g.models.slice(0, 3);
    groups.push({
      label: g.label,
      id: g.id,
      rows: models.map((m) => ({
        id: g.kind === "chatgpt" ? chatgptChoice(m.id) : ownChoice(g.id, m.id),
        label: m.label,
        note: g.kind === "chatgpt" && !g.connected ? (g.configured ? m.note : "Not set up on this server yet") : m.note,
        logo: g.id,
        available: g.connected,
        action: g.connected ? undefined : g.kind === "chatgpt" ? (g.configured ? "connect" : undefined) : "key",
      })),
    });
  }
  groups.splice(1, 0, {
    label: "Naazhi",
    id: "naazhi",
    rows: providers.map((p) => ({ id: p.id, label: p.label, note: p.available ? p.note : "Not connected yet", logo: "naazhi", available: p.available })),
  });

  const pick = (r: Row) => {
    if (r.action) return setDialog(r.id.startsWith("chatgpt:") ? "chatgpt" : "keys");
    if (!r.available) return;
    onSelect(r.id);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="cx-model inline-flex h-[38px] items-center gap-2 rounded-pill px-3 text-[14px] text-fg-muted hover:bg-hover hover:text-fg" aria-label="Choose AI">
            {current.label} <FA icon={faChevronDown} className="text-[10px]" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" collisionPadding={12} className="flex max-h-[min(520px,var(--radix-popover-content-available-height))] w-[min(420px,calc(100vw-24px))] flex-col p-0">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {groups.map((g) => (
              <section key={g.id} aria-label={g.label}>
                <h3 className="m-0 px-2.5 pt-3 pb-1.5 text-[13px] font-medium text-ink-3 first:pt-1.5">{g.label}</h3>
                <ul className="m-0 list-none p-0">
                  {g.rows.map((r) => {
                    const on = r.id === current.id;
                    return (
                      <li key={r.id}>
                        <div className="flex items-center gap-3 rounded-r2 px-2.5 py-2 hover:bg-hover">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left disabled:cursor-default"
                            disabled={!r.available && !r.action}
                            aria-pressed={on}
                            onClick={() => pick(r)}
                          >
                            <span className="grid size-9 shrink-0 place-items-center rounded-r2 bg-hover">
                              {r.logo === "naazhi" ? <BrandMark size={18} /> : <ProviderLogo id={r.logo} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <b className={`block truncate text-[15px] ${r.available ? "font-medium text-ink" : "font-normal text-ink-2"}`}>{r.label}</b>
                              <small className="block truncate text-[13px] text-ink-3">{r.note}</small>
                            </span>
                          </button>
                          {on && r.available && <FA icon={faCheck} className="mr-1 text-[13px]" aria-label="Selected" />}
                          {r.action && (
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => pick(r)}>
                              {r.action === "connect" ? "Connect" : "Add key"}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
          <div className="shrink-0 border-t p-1.5">
            <button
              type="button"
              className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-r2 px-3 text-left text-[14.5px] hover:bg-hover"
              onClick={() => setDialog("keys")}
            >
              <FA icon={faKey} className="w-4 text-[13px] text-ink-2" /> Manage API keys
            </button>
          </div>
        </PopoverContent>
      </Popover>
      {dialog && <ConnectAiDialog start={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}

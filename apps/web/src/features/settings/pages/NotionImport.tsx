"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "../../../components/ui/Confirm";
import { useConnectNotion, useDisconnectNotion, useImportNotionPages, useNotionPages, useNotionStatus } from "../../integrations/notion";
import { Input } from "@/components/ui/input";
import { SettingsNotice } from "../ui";

/** Plain words for what an import did. */
function summary(r: { imported: number; skipped: number; failed: number }) {
  const parts = [`Imported ${r.imported} ${r.imported === 1 ? "page" : "pages"} as notes`];
  if (r.skipped) parts.push(`${r.skipped} already imported`);
  if (r.failed) parts.push(`${r.failed} couldn’t be read`);
  return `${parts.join(", ")}.`;
}

/**
 * Import from Notion: connect once (Notion's own sign-in, where the person chooses what to share), pick pages, and each becomes a note.
 * Pages already imported are marked and skipped, so importing again never adds copies.
 */
export default function NotionImport({ onImported }: { onImported?: (notes: number) => void }) {
  const status = useNotionStatus();
  const connect = useConnectNotion();
  const disconnect = useDisconnectNotion();
  const run = useImportNotionPages();
  const { ask, dialog } = useConfirm();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const connected = status.data?.connected ?? false;
  const pages = useNotionPages(q, connected);
  const list = pages.data?.pages.flatMap((p) => p.pages) ?? [];
  const fresh = list.filter((p) => !p.imported);

  // The sign-in sends the person back here with the outcome in the address; show it once, then tidy the address.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("notion");
    if (!r) return;
    setResult(r === "connected" ? { ok: true, text: "Notion is connected. Choose the pages to import." } : { ok: false, text: sp.get("msg") || "Notion couldn’t be connected." });
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function importIds(ids: string[]) {
    setResult(null);
    try {
      const r = await run.mutateAsync(ids);
      setResult({ ok: r.imported > 0 || r.skipped > 0, text: summary(r) });
      if (r.imported > 0) onImported?.(r.imported);
      setPicked(new Set());
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "Couldn’t finish that import." });
    }
  }

  const busy = connect.isPending || disconnect.isPending || run.isPending;
  const error = connect.error ?? disconnect.error;

  return (
    <div className="flex flex-col gap-3 p-4">
      {result && (
        <p className={result.ok ? "m-0 text-[14px] text-green-fg" : "form-err m-0"} role={result.ok ? "status" : "alert"}>
          {result.text}
        </p>
      )}
      {status.data && !status.data.configured && <SettingsNotice>Connecting Notion isn’t available yet. It will appear here as soon as it is switched on for Naazhi.</SettingsNotice>}
      {error && (
        <p className="form-err m-0" role="alert">
          {error.message}
        </p>
      )}
      {!connected ? (
        <div className="flex items-center justify-between gap-3 max-[600px]:flex-wrap">
          <p className="m-0 text-[13.5px] text-ink-3">You sign in on Notion’s own page and choose which pages to share, so Naazhi never sees your password.</p>
          <Button disabled={busy || !status.data?.configured} onClick={() => connect.mutate()}>
            {connect.isPending ? "Opening Notion…" : "Connect Notion"}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 max-[600px]:flex-wrap">
            <p className="m-0 text-[13.5px] text-ink-3">{result?.ok && result.text.startsWith("Notion is connected") ? "Only pages you shared with the connection in Notion are listed." : "Notion is connected. Only pages you shared with the connection in Notion are listed."}</p>
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                if (await ask({ title: "Disconnect Notion?", body: "Naazhi will stop reading your Notion. Notes you already imported stay.", confirmLabel: "Disconnect", danger: true })) disconnect.mutate();
              }}
            >
              Disconnect
            </Button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPicked(new Set());
              setQ(search.trim());
            }}
          >
            <Input className="min-w-0 flex-1" aria-label="Search your Notion pages" placeholder="Search your Notion pages" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Button type="submit" variant="outline" disabled={pages.isFetching}>
              Search
            </Button>
          </form>
          {pages.isError && (
            <p className="form-err m-0" role="alert">
              {pages.error.message}
            </p>
          )}
          {pages.isPending ? (
            <p className="m-0 text-[13.5px] text-ink-3">Reading your Notion pages…</p>
          ) : list.length === 0 ? (
            <p className="m-0 text-[13.5px] text-ink-3">No pages found. In Notion, open a page, press ••• → Connections and add the connection to share it.</p>
          ) : (
            <ul className="m-0 flex max-h-[360px] list-none flex-col gap-1.5 overflow-auto p-0">
              {list.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-ctl bg-hover px-3 py-2">
                    <input type="checkbox" className="size-4" disabled={p.imported || busy} checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{p.title}</span>
                    {p.imported && <span className="shrink-0 text-[12.5px] text-ink-3">Imported</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={busy || picked.size === 0} onClick={() => void importIds([...picked])}>
              {run.isPending ? "Importing…" : `Import selected${picked.size ? ` (${picked.size})` : ""}`}
            </Button>
            <Button variant="outline" disabled={busy || fresh.length === 0} onClick={() => void importIds(fresh.map((p) => p.id))}>
              Import all listed
            </Button>
            {pages.hasNextPage && (
              <Button variant="outline" disabled={pages.isFetchingNextPage} onClick={() => void pages.fetchNextPage()}>
                {pages.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            )}
          </div>
        </>
      )}
      {dialog}
    </div>
  );
}

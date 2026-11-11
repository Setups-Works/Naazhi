"use client";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Icon as FA } from "@/components/ui/Icon";
import { faCircleCheck, faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/cn";
import { api } from "../../../lib/api/client";
import { qk } from "../../../lib/query/keys";
import { fromDrop, fromFileList, importSummary, importVault, type VaultFile } from "../../settings/importVault";
import { Actions, Card, Lead, Soon, Tile, Title, type Ctx } from "../ui";

/**
 * Bring notes across. An Obsidian vault is a real import (the same one as Settings → Imports: folders stay folders, duplicates are
 * skipped, files are read in the browser). Notion needs a connection, which is not built yet, so it says "Soon".
 */
export function ImportScreen({ ctx }: { ctx: Ctx }) {
  const sb = useMemo(api, []);
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  async function run(files: VaultFile[]) {
    setBusy(true);
    setMsg("");
    try {
      const r = await importVault(sb, files, ctx.prefs.defaultCategory);
      setMsg(importSummary(r));
      if (r.imported > 0) {
        setOk(true);
        ctx.mark("import");
        // The same short history Settings shows under Recent imports.
        const entry = { at: new Date().toISOString(), source: "Obsidian", notes: r.imported, folders: r.folders };
        ctx.setPrefs({ ...ctx.prefs, recentImports: [entry, ...ctx.prefs.recentImports].slice(0, 10) });
        void qc.invalidateQueries({ queryKey: qk.notes.all });
        void qc.invalidateQueries({ queryKey: qk.notes.folders });
      }
    } catch {
      setMsg("Couldn’t finish that import. Some notes may already have been added.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="mx-auto w-full max-w-[680px] px-6 py-8">
      <Title>Bring your notes with you.</Title>
      <Lead>Move your Obsidian vault into Naazhi and keep your notes organised. Folders stay folders, and existing notes won’t be duplicated, so everything stays clean.</Lead>
      <Lead className="mt-3">You can also skip this now and come back to it any time in Settings.</Lead>

      <div className="mt-8 grid gap-3">
        <Card
          className={cn("px-5 py-4 transition-colors", over && "border-fg bg-hover")}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void fromDrop(e.dataTransfer).then((files) => (files.length ? run(files) : setMsg("Drop the vault’s folder, not a single file.")));
          }}
        >
          <div className="flex items-center gap-4">
            <Tile>{ok ? <FA icon={faCircleCheck} className="text-green-fg" /> : <FA icon={faFolderOpen} />}</Tile>
            <div className="min-w-0 flex-1">
              <b className="block text-[16.5px] font-semibold text-fg">Obsidian</b>
              <span className="block text-[14.5px] text-fg-muted">Choose your vault folder, or drop it here</span>
            </div>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? "Importing…" : ok ? "Add another" : "Choose vault"}
            </button>
            <input
              ref={input}
              type="file"
              hidden
              multiple
              // A folder picker: the browser hands back every file with its path inside the folder.
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={(e) => void run(fromFileList(e.target.files))}
            />
          </div>
        </Card>
        <Card className="flex items-center gap-4 px-5 py-4">
          <Tile className="font-semibold">N</Tile>
          <div className="min-w-0 flex-1">
            <b className="block text-[16.5px] font-semibold text-fg">Notion</b>
            <span className="block text-[14.5px] text-fg-muted">Pick the pages Naazhi should read</span>
          </div>
          <Soon />
        </Card>
      </div>

      <p className="m-0 mt-4 min-h-6 text-[14.5px] text-fg-muted" role="status">
        {msg || "Imports only read the files you pick, in your browser, and add them to your notes."}
      </p>
      <Actions ctx={ctx} hideSkip label={ok ? "Continue" : "Continue without importing"} />
    </div>
  );
}

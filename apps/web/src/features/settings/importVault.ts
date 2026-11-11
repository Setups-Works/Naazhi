import type { api } from "../../lib/api/client";

/** Bring an Obsidian vault in as notes: folders stay folders, duplicates are skipped. Used by Settings → Imports and by onboarding. */
export const MAX_FILES = 500;
export const MAX_FILE_BYTES = 1_000_000;

/** A file with its path inside the vault ("Vault/Work/a.md"). */
export type VaultFile = { file: File; path: string };

export type VaultResult = { total: number; imported: number; skipped: number; folders: number };

/** The files of a folder picker (`webkitdirectory`): the browser reports each file's path inside the folder. */
export const fromFileList = (list: FileList | null): VaultFile[] =>
  Array.from(list ?? []).map((file) => ({ file, path: file.webkitRelativePath || file.name }));

/** Every Markdown file inside folders dropped on the page. Stops reading once the limit is reached. */
export async function fromDrop(dt: DataTransfer): Promise<VaultFile[]> {
  const out: VaultFile[] = [];
  const walk = async (e: FileSystemEntry): Promise<void> => {
    if (out.length >= MAX_FILES * 2 || e.name.startsWith(".")) return;
    if (e.isFile && /\.md$/i.test(e.name)) {
      const file = await new Promise<File>((ok, fail) => (e as FileSystemFileEntry).file(ok, fail));
      out.push({ file, path: e.fullPath.replace(/^\//, "") });
    } else if (e.isDirectory) {
      const reader = (e as FileSystemDirectoryEntry).createReader();
      // readEntries hands back a batch at a time and returns an empty one at the end.
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((ok, fail) => reader.readEntries(ok, fail));
        if (batch.length === 0) break;
        for (const child of batch) await walk(child);
      }
    }
  };
  const entries = Array.from(dt.items)
    .map((i) => i.webkitGetAsEntry())
    .filter((e): e is FileSystemEntry => !!e);
  for (const e of entries) await walk(e);
  return out;
}

/** The folder a vault file sits in, one level below the vault root ("Vault/Work/a.md" → "Work"); files at the root have none. */
const topFolder = (path: string): string | null => {
  const parts = path.split("/");
  return parts.length > 2 ? parts[1] : null;
};

/** Reads the notes in `files` and adds the ones that are new. Throws if the database refuses; some notes may already have been added. */
export async function importVault(sb: ReturnType<typeof api>, files: VaultFile[], category: string): Promise<VaultResult> {
  const md = files.filter((f) => /\.md$/i.test(f.path) && !f.path.split("/").some((p) => p.startsWith(".")));
  if (md.length === 0) return { total: 0, imported: 0, skipped: 0, folders: 0 };
  const take = md.slice(0, MAX_FILES).filter((f) => f.file.size <= MAX_FILE_BYTES);
  const [notesQ, foldersQ] = await Promise.all([
    sb.from("notes").select("title,body").limit(5000),
    sb.from("note_folders").select("id,name").limit(500),
  ]);
  if (notesQ.error || foldersQ.error) throw new Error("load");
  const seen = new Set((notesQ.data ?? []).map((n) => `${n.title}\u0000${n.body}`));
  const folderIds = new Map<string, string>((foldersQ.data ?? []).map((f) => [f.name as string, f.id as string]));
  let newFolders = 0;
  const rows: { title: string; body: string; category: string; folder_id?: string }[] = [];
  for (const f of take) {
    const title = (f.path.split("/").pop() ?? f.file.name).replace(/\.md$/i, "").slice(0, 200);
    const body = (await f.file.text()).slice(0, 100_000);
    if (seen.has(`${title}\u0000${body}`)) continue;
    seen.add(`${title}\u0000${body}`);
    const folder = topFolder(f.path)?.slice(0, 60) ?? null;
    let folder_id: string | undefined;
    if (folder) {
      if (!folderIds.has(folder)) {
        const made = await sb.from("note_folders").insert({ name: folder }).select("id").single();
        if (made.error || !made.data) throw new Error("folder");
        folderIds.set(folder, made.data.id as string);
        newFolders++;
      }
      folder_id = folderIds.get(folder);
    }
    rows.push({ title, body, category, ...(folder_id ? { folder_id } : {}) });
  }
  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await sb.from("notes").insert(rows.slice(i, i + 50));
    if (error) throw new Error("notes");
  }
  return { total: md.length, imported: rows.length, skipped: md.length - rows.length, folders: newFolders };
}

export const importSummary = (r: VaultResult) =>
  r.total === 0
    ? "That folder has no Markdown notes."
    : `Imported ${r.imported} ${r.imported === 1 ? "note" : "notes"}${r.skipped > 0 ? `, skipped ${r.skipped} (duplicates, too large or over ${MAX_FILES})` : ""}.`;

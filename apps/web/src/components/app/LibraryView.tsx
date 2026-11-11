"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faDownload,
  faEllipsis,
  faFile,
  faFileLines,
  faImage,
  faLayerGroup,
  faListUl,
  faMagnifyingGlass,
  faPaperclip,
  faPen,
  faTableCells,
  faTrash,
  faWaveSquare,
  faXmark,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { api } from "../../lib/api/client";
import { qk } from "../../lib/query/keys";
import { useRealtimeInvalidate } from "../../hooks/useRealtimeInvalidate";
import type { Attachment } from "../../lib/workspace";
import Menu, { MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "../ui/Menu";
import { useConfirm, usePrompt } from "../ui/Confirm";

type Kind = "notes" | "journal_entries" | "chat_messages";
type Category = "all" | "images" | "documents" | "spreadsheets" | "other";
type Sort = "newest" | "oldest" | "name" | "size";
type LibFile = {
  key: string;
  att: Attachment;
  /** The row the file is attached to, so a rename or delete can update it. */
  table: Kind;
  rowId: string;
  rowFiles: Attachment[];
  added: string;
  where: { label: string; href: string };
};

const SORTS: [Sort, string][] = [
  ["newest", "Newest"],
  ["oldest", "Oldest"],
  ["name", "Name"],
  ["size", "Size"],
];
const PILLS: [Category, string][] = [
  ["all", "All"],
  ["images", "Images"],
  ["documents", "Documents"],
  ["spreadsheets", "Spreadsheets"],
  ["other", "Other"],
];

const categoryOf = (a: Attachment): Exclude<Category, "all"> => {
  const t = a.type.toLowerCase();
  const n = a.name.toLowerCase();
  if (t.startsWith("image/")) return "images";
  if (t.includes("spreadsheet") || t.includes("excel") || t === "text/csv" || /\.(csv|xlsx?|ods|tsv)$/.test(n)) return "spreadsheets";
  if (t.includes("pdf") || t.includes("word") || t.startsWith("text/") || t.includes("document") || /\.(pdf|docx?|txt|md|rtf|pptx?)$/.test(n)) return "documents";
  return "other";
};
const typeLabel = (a: Attachment) => (a.name.includes(".") ? a.name.split(".").pop()!.toUpperCase() : (a.type.split("/")[1] ?? "FILE").toUpperCase()).slice(0, 5);
const fmtSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : b >= 1024 ? `${Math.round(b / 1024)} KB` : `${b} B`);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", ...(new Date(iso).getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}) });

type Row = { id: string; attachments: Attachment[] | null; created_at: string; title?: string; entry_date?: string; chat_id?: string; chats?: { title: string } | null };

export default function LibraryView() {
  const sb = useMemo(api, []);
  const qc = useQueryClient();
  const { ask, dialog } = useConfirm();
  const { prompt, dialog: promptDialog } = usePrompt();
  const [category, setCategory] = useState<Category>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<"gallery" | "list">("gallery");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");

  const filesQ = useQuery({
    queryKey: qk.library,
    queryFn: async (): Promise<LibFile[]> => {
      const [notes, journal, msgs] = await Promise.all([
        sb.from("notes").select("id,title,attachments,created_at").is("deleted_at", null).order("created_at", { ascending: false }).limit(1000),
        sb.from("journal_entries").select("id,entry_date,attachments,created_at").order("created_at", { ascending: false }).limit(1000),
        sb.from("chat_messages").select("id,chat_id,attachments,created_at,chats(title)").order("created_at", { ascending: false }).limit(2000),
      ]);
      if (notes.error || journal.error || msgs.error) throw new Error("load");
      const out: LibFile[] = [];
      const add = (table: Kind, rows: Row[], where: (r: Row) => LibFile["where"]) => {
        for (const r of rows) {
          const files = Array.isArray(r.attachments) ? r.attachments : [];
          for (const att of files) out.push({ key: `${table}:${r.id}:${att.path}`, att, table, rowId: r.id, rowFiles: files, added: r.created_at, where: where(r) });
        }
      };
      add("notes", (notes.data ?? []) as Row[], (r) => ({ label: `Note · ${r.title || "Untitled"}`, href: `/dashboard/notes?note=${r.id}` }));
      add("journal_entries", (journal.data ?? []) as Row[], (r) => ({ label: `Journal · ${r.entry_date}`, href: "/dashboard/journal" }));
      add("chat_messages", (msgs.data ?? []) as Row[], (r) => ({ label: `Chat · ${r.chats?.title ?? "Untitled"}`, href: `/dashboard/chat?c=${r.chat_id}` }));
      return out;
    },
  });
  useRealtimeInvalidate("notes", [qk.library]);
  useRealtimeInvalidate("journal_entries", [qk.library]);
  useRealtimeInvalidate("chat_messages", [qk.library]);
  const files = useMemo(() => filesQ.data ?? [], [filesQ.data]);

  // One signed link per file, for thumbnails, previews and downloads.
  const paths = useMemo(() => files.map((f) => f.att.path).join("|"), [files]);
  useEffect(() => {
    if (!paths) return setUrls({});
    let live = true;
    sb.storage
      .from("note-files")
      .createSignedUrls(paths.split("|"), 3600)
      .then(({ data }) => {
        if (live && data) setUrls(Object.fromEntries(data.filter((d) => d.path && d.signedUrl).map((d) => [d.path as string, d.signedUrl as string])));
      });
    return () => {
      live = false;
    };
  }, [paths, sb]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = files.filter((f) => (category === "all" || categoryOf(f.att) === category) && (!t || f.att.name.toLowerCase().includes(t)));
    const by: Record<Sort, (a: LibFile, b: LibFile) => number> = {
      newest: (a, b) => +new Date(b.added) - +new Date(a.added),
      oldest: (a, b) => +new Date(a.added) - +new Date(b.added),
      name: (a, b) => a.att.name.localeCompare(b.att.name),
      size: (a, b) => b.att.size - a.att.size,
    };
    return list.sort(by[sort]);
  }, [files, category, q, sort]);

  const open = openKey ? files.find((f) => f.key === openKey) : undefined;
  const idx = open ? shown.findIndex((f) => f.key === open.key) : -1;
  const clearFilters = () => {
    setCategory("all");
    setQ("");
  };

  async function saveRow(f: LibFile, next: Attachment[]) {
    const { error } = await sb.from(f.table).update({ attachments: next }).eq("id", f.rowId);
    if (error) setErr("Couldn’t save that change.");
    qc.invalidateQueries({ queryKey: qk.library });
  }
  async function rename(f: LibFile) {
    const name = (await prompt({ title: "Rename file", label: "File name", initial: f.att.name, confirmLabel: "Save" }))?.trim();
    if (!name || name === f.att.name) return;
    await saveRow(f, f.rowFiles.map((a) => (a.path === f.att.path ? { ...a, name: name.slice(0, 200) } : a)));
  }
  async function remove(f: LibFile) {
    const yes = await ask({
      title: "Delete this file?",
      body: <>“{f.att.name}” will be permanently deleted. This can’t be undone.</>,
      confirmLabel: "Delete file",
      danger: true,
    });
    if (!yes) return;
    await sb.storage.from("note-files").remove([f.att.path]);
    await saveRow(f, f.rowFiles.filter((a) => a.path !== f.att.path));
    if (openKey === f.key) setOpenKey(null);
  }
  const download = (f: LibFile) => {
    const u = urls[f.att.path];
    if (u) Object.assign(document.createElement("a"), { href: u, download: f.att.name, target: "_blank", rel: "noopener" }).click();
  };

  const fileMenu = (f: LibFile) => (
    <Menu label={`Options for ${f.att.name}`} trigger={<FA icon={faEllipsis} />} compact>
      <MenuItem onSelect={() => download(f)}>
        <span>
          <FA icon={faDownload} /> Download
        </span>
      </MenuItem>
      <MenuItem onSelect={() => rename(f)}>
        <span>
          <FA icon={faPen} /> Rename
        </span>
      </MenuItem>
      <MenuSeparator />
      <MenuItem danger onSelect={() => remove(f)}>
        <span>
          <FA icon={faTrash} /> Delete
        </span>
      </MenuItem>
    </Menu>
  );

  const thumb = (f: LibFile, className: string) => {
    const u = urls[f.att.path];
    const cat = categoryOf(f.att);
    return cat === "images" && u ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={u} alt="" className={cn("object-cover", className)} loading="lazy" />
    ) : (
      <span className={cn("grid place-items-center bg-side text-ink-3", className)}>
        <FA icon={f.att.type.startsWith("audio/") ? faWaveSquare : cat === "images" ? faImage : cat === "other" ? faFile : faFileLines} className="text-[28px]" />
      </span>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[940px] pb-24">
      {dialog}
      {promptDialog}
      <header className="mt-6 mb-6 flex flex-col gap-1">
        <span className="mb-3 grid size-14 place-items-center rounded-r4 bg-side text-[22px] text-ink-2" aria-hidden>
          <FA icon={faLayerGroup} />
        </span>
        <h1 className="m-0 text-[30px] leading-[1.15] font-semibold tracking-[-0.022em]">Library</h1>
        <p className="m-0 text-[16px] text-ink-3">Every file you’ve attached, in one place.</p>
        {category === "all" && !q && (
          <p className="m-0 mt-2 flex items-center gap-2 text-[14px] text-ink-3">
            <FA icon={faPaperclip} /> {files.length} {files.length === 1 ? "file" : "files"}
          </p>
        )}
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line">
        <div className="tdo-tabs" role="group" aria-label="Layout">
          <button type="button" aria-pressed={view === "gallery"} onClick={() => setView("gallery")}>
            <FA icon={faTableCells} /> Gallery
          </button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
            <FA icon={faListUl} /> List
          </button>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="File type">
          {PILLS.map(([k, l]) => (
            <Button key={k} size="sm" variant={category === k ? "default" : "ghost"} className="rounded-pill font-normal" aria-pressed={category === k} onClick={() => setCategory(k)}>
              {l}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 pb-2">
          <div className="relative">
            <FA icon={faMagnifyingGlass} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-[12px] text-ink-3" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files" aria-label="Search files" className="h-8 w-[200px] pl-8 text-[13.5px]" />
            {q && (
              <button type="button" aria-label="Clear search" className="absolute top-1/2 right-2 -translate-y-1/2 text-ink-3 hover:text-ink" onClick={() => setQ("")}>
                <FA icon={faXmark} />
              </button>
            )}
          </div>
          <Menu label="Sort files" trigger={<>{SORTS.find(([k]) => k === sort)![1]} <FA icon={faChevronDown} /></>} className="tdo-drop">
            <MenuLabel>Sort by</MenuLabel>
            <MenuRadioGroup value={sort} onValueChange={(v) => setSort(v as Sort)}>
              {SORTS.map(([k, l]) => (
                <MenuRadioItem key={k} value={k}>
                  {l}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </Menu>
        </div>
      </div>

      {(err || filesQ.isError) && (
        <p className="form-err" role="alert">
          {err || "Couldn’t load your files."}
        </p>
      )}

      {filesQ.isSuccess && shown.length === 0 ? (
        <div className="grid place-items-center gap-2 py-16 text-center">
          <b className="text-[20px] font-semibold">{files.length === 0 ? "No files yet" : "No matching files"}</b>
          <p className="m-0 text-[14px] text-ink-3">
            {files.length === 0 ? "Attach a file to a note, journal entry or chat and it shows up here." : "Nothing matches those filters."}
          </p>
          {files.length > 0 && (
            <Button variant="outline" onClick={clearFilters} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      ) : view === "gallery" ? (
        <ul className={cn("m-0 grid list-none gap-4 p-0", "grid-cols-[repeat(auto-fill,minmax(200px,1fr))]")}>
          {shown.map((f) => (
            <li key={f.key} className="group relative">
              <button
                type="button"
                onClick={() => setOpenKey(f.key)}
                className={cn(
                  "block w-full overflow-hidden rounded-r3 border bg-raised text-left transition-colors hover:border-line-2",
                  openKey === f.key && "border-ink border-2",
                )}
              >
                {thumb(f, "h-[165px] w-full")}
                <span className="block p-3">
                  <span className="block truncate text-[14px] font-medium">{f.att.name}</span>
                  <span className="mt-0.5 block text-[12.5px] text-ink-3">
                    {typeLabel(f.att)} · {fmtSize(f.att.size)} · {fmtDate(f.added)}
                  </span>
                  <span className="mt-1 block truncate text-[12.5px] text-ink-4">{f.where.label}</span>
                </span>
              </button>
              <span className="absolute top-2 right-2 flex gap-1 rounded-ctl border bg-raised p-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [&_.ap-pop-btn]:grid [&_.ap-pop-btn]:size-6 [&_.ap-pop-btn]:place-items-center">
                <Button variant="ghost" size="icon-xs" aria-label={`Download ${f.att.name}`} onClick={() => download(f)}>
                  <FA icon={faDownload} />
                </Button>
                {fileMenu(f)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="text-left text-[12.5px] text-ink-3">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Size</th>
              <th className="py-2 font-medium max-[700px]:hidden">Where</th>
              <th className="py-2 font-medium">Added</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {shown.map((f) => (
              <tr key={f.key} className="cursor-pointer border-t border-line hover:bg-hover" onClick={() => setOpenKey(f.key)}>
                <td className="py-2">
                  <span className="flex items-center gap-3">
                    {thumb(f, "size-9 shrink-0 rounded-ctl text-[14px] [&_svg]:text-[14px]")}
                    <span className="truncate">{f.att.name}</span>
                  </span>
                </td>
                <td className="py-2 text-ink-3">{fmtSize(f.att.size)}</td>
                <td className="py-2 text-ink-4 max-[700px]:hidden">{f.where.label}</td>
                <td className="py-2 text-ink-3">{fmtDate(f.added)}</td>
                <td className="py-2" onClick={(e) => e.stopPropagation()}>
                  {fileMenu(f)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {open && (
        <aside
          aria-label="File details"
          className="fixed inset-y-0 right-0 z-[65] flex w-[min(520px,100vw)] flex-col gap-4 overflow-y-auto border-l bg-raised p-5 shadow-pop"
        >
          <div className="flex items-center gap-2 text-[14px]">
            <b className="font-semibold">{categoryOf(open.att) === "images" ? "Image" : "File"}</b>
            <span className="ml-auto flex items-center gap-1 text-ink-3">
              <Button variant="ghost" size="icon-xs" aria-label="Previous file" disabled={idx <= 0} onClick={() => setOpenKey(shown[idx - 1].key)}>
                ‹
              </Button>
              <span className="text-[13px]">
                {idx + 1} of {shown.length}
              </span>
              <Button variant="ghost" size="icon-xs" aria-label="Next file" disabled={idx < 0 || idx >= shown.length - 1} onClick={() => setOpenKey(shown[idx + 1].key)}>
                ›
              </Button>
              {fileMenu(open)}
              <Button variant="ghost" size="icon-xs" aria-label="Close" onClick={() => setOpenKey(null)}>
                <FA icon={faXmark} />
              </Button>
            </span>
          </div>
          <div className="overflow-hidden rounded-r3 bg-side">
            {categoryOf(open.att) === "images" && urls[open.att.path] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[open.att.path]} alt={open.att.name} className="max-h-[360px] w-full object-contain" />
            ) : (
              thumb(open, "h-[220px] w-full")
            )}
          </div>
          <h2 className="m-0 text-[18px] font-semibold break-words">{open.att.name}</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => download(open)}>
              <FA icon={faDownload} /> Download
            </Button>
            <Button variant="ghost" onClick={() => rename(open)}>
              Rename
            </Button>
            <Button variant="ghost" className="text-critical" onClick={() => remove(open)}>
              Delete
            </Button>
          </div>
          <dl className="m-0 grid grid-cols-[90px_1fr] gap-x-3 gap-y-2 border-t border-line pt-4 text-[14px]">
            <dt className="text-ink-3">Type</dt>
            <dd className="m-0">{open.att.type || typeLabel(open.att)}</dd>
            <dt className="text-ink-3">Size</dt>
            <dd className="m-0">{fmtSize(open.att.size)}</dd>
            <dt className="text-ink-3">Added</dt>
            <dd className="m-0">{fmtDate(open.added)}</dd>
            <dt className="text-ink-3">Attached to</dt>
            <dd className="m-0">
              <Link href={open.where.href} className="underline underline-offset-2">
                {open.where.label}
              </Link>
            </dd>
          </dl>
        </aside>
      )}
    </div>
  );
}

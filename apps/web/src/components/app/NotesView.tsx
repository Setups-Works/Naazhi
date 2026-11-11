"use client";
import SidebarPortal from "./SidebarPortal";
import NotesAtlas from "./NotesAtlas";
import ShareNoteDialog from "./ShareNoteDialog";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faCheck,
  faDiagramProject,
  faEarthAmericas,
  faLayerGroup,
  faChevronDown,
  faEllipsis,
  faFolder,
  faFolderPlus,
  faTag,
  faFileExport,
  faFileLines,
  faListUl,
  faTableCells,
  faGripVertical,
  faImage,
  faMagnifyingGlass,
  faMicrophone,
  faPaperclip,
  faPlus,
  faStop,
  faThumbtack,
  faSquareCheck,
  faTrash,
  faWaveSquare,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api/client";
import { qk } from "../../lib/query/keys";
import { useRealtimeInvalidate } from "../../hooks/useRealtimeInvalidate";
import { useDraftText } from "../../hooks/useDraft";
import type { Attachment, Note } from "../../lib/workspace";
import { CATEGORIES, NOTE_COLS, displayTitle, editedLabel, safeName } from "../../lib/notes";
import Markdown from "./Markdown";
import Menu, { MenuCheckItem, MenuItem, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuSeparator } from "../ui/Menu";
import { useConfirm, usePrompt } from "../ui/Confirm";
import { readPrefs } from "../../lib/prefs";
import NoteEditor from "./NoteEditor";
import { ctxProps, useCtxActions } from "../../lib/context-actions";

type Filter = "all" | "pinned" | "voice" | "checklists" | "shared";
type Mode = "notes" | "trash" | "atlas";
/** Days a note stays in the Trash before it is deleted for good. */
const TRASH_DAYS = 30;
type Sort = "manual" | "edited" | "created" | "title";
type View = "gallery" | "list";
const isChecklist = (n: Note) => /^\s*[-*] \[[ xX]\] /m.test(n.body);
const MAX_BYTES = 10 * 1024 * 1024;
const EMPTY_NOTES: Note[] = []; // stable reference while the query loads

const SORT_LABEL: Record<string, string> = { manual: "Manual", edited: "Last edited", created: "Created", title: "Title A–Z" };

export default function NotesView() {
  const sb = useMemo(api, []);
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [cats, setCats] = useState<string[]>([]);
  const [withFiles, setWithFiles] = useState(false);
  const [sort, setSort] = useState<Sort>("edited");
  const [view, setView] = useState<View>("gallery");
  // null = every note; a folder id = only that folder; labelsOn = notes that carry every chosen label.
  const [folder, setFolder] = useState<string | null>(null);
  const [labelsOn, setLabelsOn] = useState<string[]>([]);
  const folderRef = useRef<string | null>(null);
  folderRef.current = folder;
  const [cap, setCap] = useDraftText("notes:capture");
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const capRef = useRef<HTMLInputElement>(null);
  const img = useRef<HTMLInputElement>(null);
  const uid = useRef<string>("");
  const creating = useRef(false);
  const mr = useRef<MediaRecorder | null>(null);
  const { ask, dialog } = useConfirm();
  const { prompt, dialog: promptDialog } = usePrompt();

  // "Open new notes in full screen" (Settings → Notes). Read after mount so the server and browser render the same first.
  const [full, setFull] = useState(false);
  useEffect(() => setFull(readPrefs().notesFullScreen), []);
  const openId = params.get("note");
  const open = useCallback((id: string) => router.push(`/dashboard/notes?note=${id}`, { scroll: false }), [router]);
  const close = useCallback(() => router.push("/dashboard/notes", { scroll: false }), [router]);

  // The notes list is a cached query. Local changes go through the cache (`setNotes`), and `load()` marks it stale so it refetches.
  const notesQ = useQuery({
    queryKey: qk.notes.all,
    queryFn: async () => {
      const { data, error } = await sb.from("notes").select(NOTE_COLS).is("deleted_at", null).order("sort_order", { ascending: false }).limit(1000);
      if (error) throw error;
      return data as Note[];
    },
  });
  const notes = notesQ.data ?? EMPTY_NOTES;
  const ready = !notesQ.isPending;
  const foldersQ = useQuery({
    queryKey: qk.notes.folders,
    queryFn: async () => {
      const { data, error } = await sb.from("note_folders").select("id,name").order("created_at");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });
  const folders = foldersQ.data ?? [];
  useRealtimeInvalidate("note_folders", [qk.notes.folders]);
  const labels = useMemo(() => [...new Set(notes.flatMap((n) => n.labels ?? []))].sort((a, b) => a.localeCompare(b)), [notes]);
  const setNotes = useCallback((fn: (all: Note[]) => Note[]) => qc.setQueryData<Note[]>(qk.notes.all, (old) => fn(old ?? [])), [qc]);
  const load = useCallback(() => qc.invalidateQueries({ queryKey: qk.notes.all }), [qc]);
  useRealtimeInvalidate("notes", [qk.notes.all]);
  useEffect(() => {
    setErr(notesQ.isError ? "Couldn’t load your notes." : "");
  }, [notesQ.isError]);
  // The user id is needed for storage paths; fetch it separately so it's set even when the list comes straight from the cache.
  useEffect(() => {
    sb.auth.getUser().then(({ data }) => {
      uid.current = data.user?.id ?? "";
    });
  }, [sb]);

  /* ---- create / change ---- */
  const create = useCallback(
    async (init: Partial<Pick<Note, "title" | "body" | "kind" | "category">> = {}) => {
      const into = folderRef.current;
      const { data, error } = await sb
        .from("notes")
        .insert({ title: "", body: "", category: readPrefs().defaultCategory, ...(into ? { folder_id: into } : {}), ...init })
        .select(NOTE_COLS)
        .single();
      if (error || !data) {
        setErr("Couldn’t create a note.");
        return null;
      }
      setNotes((all) => [data as Note, ...all]);
      return data as Note;
    },
    [sb],
  );

  useEffect(() => {
    if (!ready || creating.current) return;
    if (openId === "new" || params.get("new")) {
      creating.current = true;
      create().then((n) => {
        creating.current = false;
        router.replace(n ? `/dashboard/notes?note=${n.id}` : "/dashboard/notes");
      });
    }
  }, [ready, openId, params, create, router]);

  const patchLocal = (id: string, p: Partial<Note>) => setNotes((all) => all.map((n) => (n.id === id ? { ...n, ...p } : n)));
  async function patch(id: string, p: Partial<Note>) {
    patchLocal(id, p);
    const { error } = await sb.from("notes").update(p).eq("id", id);
    if (error) {
      setErr("Couldn’t save that change.");
      load();
    }
  }

  async function upload(noteId: string, file: Blob, name: string, type: string): Promise<Attachment | null> {
    if (file.size > MAX_BYTES) {
      setErr("Files can be up to 10 MB.");
      return null;
    }
    const path = `${uid.current}/${noteId}/${crypto.randomUUID()}-${safeName(name)}`;
    const { error } = await sb.storage.from("note-files").upload(path, file, { contentType: type || "application/octet-stream" });
    if (error) {
      setErr("Couldn’t upload that file.");
      return null;
    }
    return { path, name, type: type || "application/octet-stream", size: file.size };
  }
  async function attach(noteId: string, file: File) {
    const a = await upload(noteId, file, file.name, file.type);
    const n = notes.find((x) => x.id === noteId);
    if (a && n) patch(noteId, { attachments: [...n.attachments, a] });
  }
  async function removeAttachment(noteId: string, a: Attachment) {
    const n = notes.find((x) => x.id === noteId);
    if (!n) return;
    await sb.storage.from("note-files").remove([a.path]);
    patch(noteId, { attachments: n.attachments.filter((x) => x.path !== a.path) });
  }

  /* ---- Trash: notes are moved here instead of being deleted, and can be restored ---- */
  const [mode, setMode] = useState<Mode>("notes");
  const [undo, setUndo] = useState<{ ids: string[]; text: string } | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const trashQ = useQuery({
    queryKey: qk.notes.trash,
    queryFn: async () => {
      const { data, error } = await sb.from("notes").select(NOTE_COLS).not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data as Note[];
    },
  });
  const trashed = trashQ.data ?? EMPTY_NOTES;
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 8000);
    return () => clearTimeout(t);
  }, [undo]);
  const refreshAll = () => qc.invalidateQueries({ queryKey: qk.notes.all });

  async function trash(ids: string[]) {
    const chosen = notes.filter((n) => ids.includes(n.id));
    if (!chosen.length) return;
    const { error } = await sb.from("notes").update({ deleted_at: new Date().toISOString() }).in(
      "id",
      chosen.map((n) => n.id),
    );
    if (error) return setErr("Couldn’t move that to the Trash.");
    setNotes((all) => all.filter((x) => !ids.includes(x.id)));
    await refreshAll();
    setUndo({ ids: chosen.map((n) => n.id), text: chosen.length === 1 ? `“${displayTitle(chosen[0])}” moved to the Trash` : `${chosen.length} notes moved to the Trash` });
    if (openId && ids.includes(openId)) close();
  }
  const remove = (id: string) => trash([id]);
  async function restore(ids: string[]) {
    const { error } = await sb.from("notes").update({ deleted_at: null }).in("id", ids);
    if (error) return setErr("Couldn’t restore that.");
    setUndo(null);
    await refreshAll();
  }
  /** Deletes notes for good: their files first, then the rows. Used by "Delete forever", "Empty Trash" and the 30-day clean-up. */
  const eraseForever = useCallback(
    async (list: Note[]) => {
      if (!list.length) return false;
      const files = list.flatMap((n) => n.attachments.map((a) => a.path));
      if (files.length) await sb.storage.from("note-files").remove(files);
      const { error } = await sb.from("notes").delete().in(
        "id",
        list.map((n) => n.id),
      );
      if (error) return false;
      qc.invalidateQueries({ queryKey: qk.notes.all });
      return true;
    },
    [sb, qc],
  );
  async function deleteForever(n: Note) {
    const yes = await ask({
      title: "Delete this note forever?",
      body: <>“{displayTitle(n)}” and its attachments will be permanently deleted. This can’t be undone.</>,
      confirmLabel: "Delete forever",
      danger: true,
    });
    if (yes && !(await eraseForever([n]))) setErr("Couldn’t delete that note.");
  }
  async function emptyTrash() {
    if (!trashed.length) return;
    const yes = await ask({
      title: "Empty the Trash?",
      body: <>{trashed.length === 1 ? "1 note" : `${trashed.length} notes`} and their attachments will be permanently deleted. This can’t be undone.</>,
      confirmLabel: "Empty Trash",
      danger: true,
    });
    if (yes && !(await eraseForever(trashed))) setErr("Couldn’t empty the Trash.");
  }
  // Notes that have sat in the Trash for 30 days are cleared out the next time the Trash is loaded.
  const purged = useRef(false);
  useEffect(() => {
    if (purged.current || !trashQ.data) return;
    purged.current = true;
    const cutoff = Date.now() - TRASH_DAYS * 86_400_000;
    void eraseForever(trashQ.data.filter((n) => n.deleted_at && +new Date(n.deleted_at) < cutoff));
  }, [trashQ.data, eraseForever]);

  // "Select notes": tick several cards, then export or delete them together.
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const stopSelecting = () => {
    setSelecting(false);
    setPicked(new Set());
  };
  const toggleOne = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  async function removePicked() {
    await trash([...picked]);
    stopSelecting();
  }
  function exportPicked() {
    const text = notes
      .filter((n) => picked.has(n.id))
      .map((n) => `# ${displayTitle(n)}\n\n${n.body}`.trim())
      .join("\n\n---\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    Object.assign(document.createElement("a"), { href: url, download: "notes.md" }).click();
    URL.revokeObjectURL(url);
  }
  async function duplicate(id: string) {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    const c = await create({ title: `${n.title || displayTitle(n)} (copy)`, body: n.body, category: n.category, kind: "text" });
    if (c) open(c.id);
  }

  // Right-click actions on a note card (see lib/context-actions).
  useCtxActions("note", (id, action) => {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    if (action === "open") open(id);
    else if (action === "pin") void patch(id, { pinned: !n.pinned });
    else if (action === "duplicate") void duplicate(id);
    else if (action === "delete") void remove(id);
  });

  /* ---- quick capture ---- */
  async function capture(openEditor = false) {
    const text = cap.trim();
    if (!text && !openEditor) return;
    const [first, ...rest] = text.split("\n");
    const n = await create({ title: text ? first.slice(0, 120) : "", body: rest.join("\n").trim() });
    setCap("");
    if (n && openEditor) open(n.id);
  }
  async function captureFile(f: File) {
    const n = await create({ title: f.name.replace(/\.[^.]+$/, "").slice(0, 120) });
    if (!n) return;
    const a = await upload(n.id, f, f.name, f.type);
    if (a)
      (patchLocal(n.id, { attachments: [a] }),
        await sb
          .from("notes")
          .update({ attachments: [a] })
          .eq("id", n.id));
    open(n.id);
  }

  async function toggleRecord() {
    if (recording) return mr.current?.stop();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setErr("Microphone access was blocked. Allow it in your browser to record voice notes.");
    }
    const rec = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const timer = setInterval(() => setSecs((s) => s + 1), 1000);
    rec.onstop = async () => {
      clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      setSecs(0);
      const type = (rec.mimeType || "audio/webm").split(";")[0];
      const blob = new Blob(chunks, { type });
      if (!blob.size) return;
      const n = await create({ title: "Voice note", kind: "voice", category: "Others" });
      if (!n) return;
      const a = await upload(n.id, blob, `voice-note.${type.includes("mp4") ? "m4a" : "webm"}`, type);
      if (a) {
        patchLocal(n.id, { attachments: [a] });
        await sb
          .from("notes")
          .update({ attachments: [a] })
          .eq("id", n.id);
      }
      open(n.id);
    };
    mr.current = rec;
    setSecs(0);
    setRecording(true);
    rec.start();
  }
  useEffect(
    () => () => {
      if (mr.current?.state === "recording") mr.current.stop();
    },
    [],
  );

  /* ---- shortcuts ---- */
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        capture(true);
      }
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  });

  /* ---- list ---- */
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = notes.filter(
      (n) =>
        (filter === "all" ||
          (filter === "pinned" ? n.pinned : filter === "voice" ? n.kind === "voice" : filter === "shared" ? !!n.share_token : isChecklist(n))) &&
        (!cats.length || cats.includes(n.category)) &&
        (!withFiles || n.attachments.length > 0) &&
        (folder === null || n.folder_id === folder) &&
        labelsOn.every((l) => (n.labels ?? []).includes(l)) &&
        (!t || `${n.title} ${n.body} ${n.category}`.toLowerCase().includes(t)),
    );
    const by: Record<Sort, (a: Note, b: Note) => number> = {
      manual: (a, b) => b.sort_order - a.sort_order,
      edited: (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at),
      created: (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      title: (a, b) => displayTitle(a).localeCompare(displayTitle(b)),
    };
    return list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || by[sort](a, b));
  }, [notes, q, filter, cats, withFiles, sort, folder, labelsOn]);

  async function drop(targetId: string) {
    const id = dragId;
    setDragId(null);
    setOverId(null);
    if (!id || id === targetId) return;
    const order = shown.filter((n) => n.id !== id);
    const at = order.findIndex((n) => n.id === targetId);
    const above = order[at - 1],
      below = order[at];
    // Land just before the card it was dropped on.
    const so = above && below ? (above.sort_order + below.sort_order) / 2 : below ? below.sort_order + 1000 : 0;
    patch(id, { sort_order: so });
  }

  const current = openId && openId !== "new" ? notes.find((n) => n.id === openId) : undefined;
  const filtersOn = cats.length + (withFiles ? 1 : 0);
  const pills: [Filter, string][] = [
    ["all", "All notes"],
    ["pinned", "Pinned"],
    ["voice", "Voice"],
    ["checklists", "Checklists"],
    ["shared", "Shared"],
  ];

  async function newFolder() {
    const name = (await prompt({ title: "New folder", label: "Folder name", placeholder: "Work, Ideas, Recipes…", confirmLabel: "Create folder" }))?.trim();
    if (!name) return;
    const { error } = await sb.from("note_folders").insert({ name: name.slice(0, 60) });
    if (error) setErr("Couldn’t create that folder.");
    else qc.invalidateQueries({ queryKey: qk.notes.folders });
  }
  async function renameFolder(f: { id: string; name: string }) {
    const name = (await prompt({ title: "Rename folder", label: "Folder name", initial: f.name, confirmLabel: "Save" }))?.trim();
    if (!name || name === f.name) return;
    const { error } = await sb.from("note_folders").update({ name: name.slice(0, 60) }).eq("id", f.id);
    if (error) setErr("Couldn’t rename that folder.");
    else qc.invalidateQueries({ queryKey: qk.notes.folders });
  }
  async function deleteFolder(f: { id: string; name: string }) {
    const yes = await ask({
      title: "Delete this folder?",
      body: <>“{f.name}” will be deleted. Its notes aren’t lost — they move out of the folder.</>,
      confirmLabel: "Delete folder",
      danger: true,
    });
    if (!yes) return;
    const { error } = await sb.from("note_folders").delete().eq("id", f.id);
    if (error) return setErr("Couldn’t delete that folder.");
    if (folder === f.id) setFolder(null);
    setNotes((all) => all.map((n) => (n.folder_id === f.id ? { ...n, folder_id: null } : n)));
    qc.invalidateQueries({ queryKey: qk.notes.folders });
  }

  /** One Markdown file with every note that is on screen, for backing up or moving to another app. */
  function exportMarkdown() {
    const text = shown.map((n) => `# ${displayTitle(n)}\n\n${n.body}`.trim()).join("\n\n---\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "notes.md" });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="nt" data-open={!!current} data-full={full}>
      {dialog}
      {promptDialog}
      <SidebarPortal>
        <nav className="sbt" aria-label="Notes">
          <button type="button" className="sbt-item" onClick={() => { setMode("notes"); capture(true); }}>
            <FA icon={faPlus} /> <span>New note</span>
            <kbd className="ml-auto font-sans text-[12px] font-normal text-ink-4">⌘E</kbd>
          </button>
          <label className="sbs-search mt-1 mb-0">
            <FA icon={faMagnifyingGlass} />
            <input ref={search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes" aria-label="Search notes" />
            <kbd className="font-sans text-[12px] text-ink-4">/</kbd>
          </label>
          <h3 className="m-0 mt-4 mb-1 px-2.5 text-[12px] font-medium text-ink-4">Folders</h3>
          {folders.length === 0 && <p className="sbt-hint">No folders yet</p>}
          {folders.map((f) => (
            <div key={f.id} className="group/f flex items-center">
              <button type="button" className="sbt-item min-w-0 flex-1" data-on={mode === "notes" && folder === f.id} aria-pressed={mode === "notes" && folder === f.id} onClick={() => { setMode("notes"); setFolder(folder === f.id && mode === "notes" ? null : f.id); }}>
                <FA icon={faFolder} /> <span>{f.name}</span>
                <em>{notes.filter((n) => n.folder_id === f.id).length}</em>
              </button>
              <span className="opacity-0 transition-opacity group-focus-within/f:opacity-100 group-hover/f:opacity-100">
                <Menu label={`Options for ${f.name}`} trigger={<FA icon={faEllipsis} />} compact>
                  <MenuItem onSelect={() => renameFolder(f)}>Rename</MenuItem>
                  <MenuItem danger onSelect={() => deleteFolder(f)}>
                    Delete folder
                  </MenuItem>
                </Menu>
              </span>
            </div>
          ))}
          <button type="button" className="sbt-item mt-3" data-on={mode === "notes" && folder === null} aria-pressed={mode === "notes" && folder === null} onClick={() => { setMode("notes"); setFolder(null); }}>
            <FA icon={faLayerGroup} /> <span>All notes</span>
          </button>
          <button type="button" className="sbt-item" data-on={mode === "atlas"} aria-pressed={mode === "atlas"} onClick={() => setMode("atlas")}>
            <FA icon={faDiagramProject} /> <span>Atlas</span>
          </button>
          <button type="button" className="sbt-item" data-on={mode === "trash"} aria-pressed={mode === "trash"} onClick={() => setMode("trash")}>
            <FA icon={faTrash} /> <span>Trash</span>
            {trashed.length > 0 && <em>{trashed.length}</em>}
          </button>
        </nav>
      </SidebarPortal>

      {mode === "trash" ? (
        <section aria-label="Trash">
          <div className="nt-head">
            <span className="nt-tile" aria-hidden>
              <FA icon={faTrash} />
            </span>
            <h1 className="nt-h1">Trash</h1>
            <p className="nt-count">
              {trashed.length} {trashed.length === 1 ? "note" : "notes"}
            </p>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 rounded-r3 bg-side px-4 py-3 text-[14px] text-ink-2 max-[600px]:flex-wrap">
            <span>Notes in the Trash are deleted for good after {TRASH_DAYS} days.</span>
            <button type="button" className="btn btn-secondary btn-sm" disabled={!trashed.length} onClick={emptyTrash}>
              Empty Trash
            </button>
          </div>
          {err && (
            <p className="form-err" role="alert">
              {err}
            </p>
          )}
          {trashed.length === 0 ? (
            <p className="mt-10 text-center text-[14px] text-ink-3">{trashQ.isPending ? "Loading…" : "The Trash is empty."}</p>
          ) : (
            <ul className="m-0 mt-4 list-none divide-y divide-line border-t border-line p-0">
              {trashed.map((n) => {
                const gone = Math.floor((Date.now() - +new Date(n.deleted_at ?? n.updated_at)) / 86_400_000);
                const left = Math.max(0, TRASH_DAYS - gone);
                return (
                  <li key={n.id} className="flex items-center gap-4 py-3 max-[600px]:flex-wrap">
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[15px] font-semibold">{displayTitle(n)}</b>
                      <small className="text-[13px] text-ink-3">
                        Deleted {gone === 0 ? "today" : `${gone} ${gone === 1 ? "day" : "days"} ago`} · {left} {left === 1 ? "day" : "days"} left
                      </small>
                    </div>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => restore([n.id])}>
                      Restore
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm text-critical" onClick={() => deleteForever(n)}>
                      Delete forever
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : mode === "atlas" ? (
        <section aria-label="Atlas">
          <div className="nt-head">
            <span className="nt-tile" aria-hidden>
              <FA icon={faDiagramProject} />
            </span>
            <h1 className="nt-h1">Atlas</h1>
            <p className="nt-count">How your notes connect</p>
          </div>
          <NotesAtlas
            notes={notes}
            folders={folders}
            onOpen={(id) => {
              setMode("notes");
              open(id);
            }}
          />
        </section>
      ) : (
        <>
      <div className="nt-head">
        <span className="nt-tile" aria-hidden>
          <FA icon={faFileLines} />
        </span>
        <h1 className="nt-h1">Notes</h1>
        <p className="nt-count">
          <FA icon={faFileLines} /> {notes.length} {notes.length === 1 ? "note" : "notes"}
        </p>
        <div className="nt-tools">
          <div className="tdo-tabs" role="group" aria-label="Layout">
            <button type="button" aria-pressed={view === "gallery"} onClick={() => setView("gallery")}>
              <FA icon={faTableCells} /> Gallery
            </button>
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
              <FA icon={faListUl} /> List
            </button>
          </div>
          <div className="nt-pills" role="group" aria-label="Filter notes">
            {pills.map(([k, l]) => (
              <button key={k} data-on={filter === k} aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {l}
              </button>
            ))}
            <Menu
              label="More filters"
              trigger={<>More filters{filtersOn > 0 && <b className="nt-badge">{filtersOn}</b>}</>}
              className="nt-pill-menu"
            >
              <MenuLabel>Category</MenuLabel>
              {CATEGORIES.map((c) => (
                <MenuCheckItem
                  key={c}
                  checked={cats.includes(c)}
                  onSelect={() => setCats((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))}
                >
                  {c}
                </MenuCheckItem>
              ))}
              <MenuSeparator />
              <MenuCheckItem checked={withFiles} onSelect={() => setWithFiles(!withFiles)}>
                With attachments
              </MenuCheckItem>
              {filtersOn > 0 && (
                <MenuItem
                  onSelect={() => {
                    setCats([]);
                    setWithFiles(false);
                  }}
                >
                  Clear filters
                </MenuItem>
              )}
            </Menu>
            <Menu
              label="Labels"
              trigger={
                <>
                  <FA icon={faTag} /> Labels{labelsOn.length > 0 && <b className="nt-badge">{labelsOn.length}</b>}
                </>
              }
              className="nt-pill-menu"
            >
              {labels.length === 0 ? (
                <MenuLabel>No labels yet. Add one from a note.</MenuLabel>
              ) : (
                labels.map((l) => (
                  <MenuCheckItem
                    key={l}
                    checked={labelsOn.includes(l)}
                    onSelect={() => setLabelsOn((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))}
                  >
                    {l}
                  </MenuCheckItem>
                ))
              )}
              {labelsOn.length > 0 && <MenuItem onSelect={() => setLabelsOn([])}>Clear labels</MenuItem>}
            </Menu>
          </div>
          <Menu
            label="Sort and options"
            trigger={
              <>
                {SORT_LABEL[sort]} <FA icon={faChevronDown} />
              </>
            }
            className="nt-sort"
          >
            <MenuLabel>Sort by</MenuLabel>
            <MenuRadioGroup value={sort} onValueChange={(v) => setSort(v as Sort)}>
              {(
                [
                  ["manual", "Manual (drag to reorder)"],
                  ["edited", "Last edited"],
                  ["created", "Created"],
                  ["title", "Title A–Z"],
                ] as [Sort, string][]
              ).map(([k, l]) => (
                <MenuRadioItem key={k} value={k}>
                  {l}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
          </Menu>
          <div className="nt-split">
            <button className="btn btn-primary btn-sm" onClick={() => capture(true)}>
              <FA icon={faPlus} /> New note
            </button>
            <Menu label="More ways to add a note" trigger={<FA icon={faChevronDown} />} className="nt-split-menu">
              <MenuItem onSelect={() => capture(true)}>
                <span>
                  <FA icon={faFileLines} /> New note
                </span>
                <kbd>⌘E</kbd>
              </MenuItem>
              <MenuItem onSelect={toggleRecord}>
                <span>
                  <FA icon={faMicrophone} /> Voice note
                </span>
              </MenuItem>
              <MenuSeparator />
              <MenuItem onSelect={() => img.current?.click()}>
                <span>
                  <FA icon={faImage} /> Note from image
                </span>
              </MenuItem>
              <MenuItem onSelect={() => img.current?.click()}>
                <span>
                  <FA icon={faPaperclip} /> Note from file
                </span>
              </MenuItem>
            </Menu>
          </div>
          <Menu label="Page options" trigger={<FA icon={faEllipsis} />} className="nt-more">
            <MenuItem onSelect={() => (selecting ? stopSelecting() : setSelecting(true))}>
              <span>
                <FA icon={faSquareCheck} /> {selecting ? "Stop selecting" : "Select notes"}
              </span>
            </MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={exportMarkdown}>
              <span>
                <FA icon={faFileExport} /> Export as Markdown
              </span>
            </MenuItem>
          </Menu>
        </div>
      </div>

      <div className="nt-folders">
        <button type="button" className="nt-newfolder" onClick={newFolder}>
          <FA icon={faPlus} /> New folder
        </button>
      </div>

      {err && (
        <p className="form-err" role="alert">
          {err}
        </p>
      )}

      <div className="nt-wrap">
        <div className="nt-cards" role="list" data-view={view}>
          {shown.map((n) => (
            <article
              key={n.id}
              role="listitem"
              tabIndex={0}
              className="nt-card"
              {...ctxProps("note", n.id, { pinned: n.pinned })}
              data-on={n.id === openId}
              data-picked={selecting ? picked.has(n.id) : undefined}
              data-over={overId === n.id && dragId !== n.id}
              data-drag={dragId === n.id}
              draggable={sort === "manual"}
              onDragStart={() => setDragId(n.id)}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                if (dragId) {
                  e.preventDefault();
                  setOverId(n.id);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop(n.id);
              }}
              onClick={() => (selecting ? toggleOne(n.id) : open(n.id))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target === e.currentTarget) (selecting ? toggleOne(n.id) : open(n.id));
              }}
            >
              {selecting && (
                <span className="nt-pick" aria-hidden>
                  {picked.has(n.id) && <FA icon={faCheck} />}
                </span>
              )}
              <div className="nt-grip" aria-hidden>
                {sort === "manual" ? <FA icon={faGripVertical} /> : null}
                {n.pinned && <FA icon={faThumbtack} className="nt-pin" />}
                <span className="nt-acts" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <Menu label={`Move ${displayTitle(n)} to a folder`} trigger={<FA icon={faFolder} />} compact>
                    <MenuLabel>Move to folder</MenuLabel>
                    <MenuRadioGroup value={n.folder_id ?? ""} onValueChange={(v) => patch(n.id, { folder_id: v || null })}>
                      <MenuRadioItem value="">No folder</MenuRadioItem>
                      {folders.map((f) => (
                        <MenuRadioItem key={f.id} value={f.id}>
                          {f.name}
                        </MenuRadioItem>
                      ))}
                    </MenuRadioGroup>
                    <MenuSeparator />
                    <MenuItem onSelect={newFolder}>
                      <span>
                        <FA icon={faFolderPlus} /> New folder
                      </span>
                    </MenuItem>
                  </Menu>
                  <button type="button" aria-label={n.pinned ? "Unpin" : "Pin"} title={n.pinned ? "Unpin" : "Pin"} onClick={() => patch(n.id, { pinned: !n.pinned })}>
                    <FA icon={faThumbtack} />
                  </button>
                  <button type="button" aria-label={`Delete ${displayTitle(n)}`} title="Move to trash" onClick={() => remove(n.id)}>
                    <FA icon={faTrash} />
                  </button>
                </span>
              </div>
              <h3>{displayTitle(n)}</h3>
              {n.kind === "voice" && (
                <span className="nt-voice">
                  <FA icon={faWaveSquare} /> Voice note
                </span>
              )}
              {n.body.trim() && (
                <div className="nt-prev">
                  <Markdown text={n.body} />
                </div>
              )}
              {(n.labels ?? []).length > 0 && (
                <span className="nt-tags">
                  {(n.labels ?? []).map((l) => (
                    <small key={l}>{l}</small>
                  ))}
                </span>
              )}
              {n.attachments.length > 0 && n.kind !== "voice" && (
                <span className="nt-voice">
                  <FA icon={faPaperclip} /> {n.attachments.length} attached
                </span>
              )}
              <footer>
                <span className="nt-cat">{n.category}{n.share_token && <FA icon={faEarthAmericas} className="ml-1.5" aria-label="Shared" />}</span>
                <span>{editedLabel(n.updated_at)}</span>
              </footer>
            </article>
          ))}
          {ready && shown.length === 0 && (
            <p className="ap-none nt-empty">
              {notes.length ? "No notes match those filters." : "No notes yet — jot your first one below."}
            </p>
          )}
        </div>

        {current && (
          <NoteEditor
            key={current.id}
            note={current}
            folders={folders}
            sb={sb}
            onClose={close}
            onLocal={(id, p) => patchLocal(id, p)}
            onSaved={(id, updated_at) => patchLocal(id, { updated_at })}
            onPatch={patch}
            onDelete={remove}
            onShare={(id) => setSharing(id)}
            onDuplicate={duplicate}
            onAttach={attach}
            onRemoveAttachment={removeAttachment}
          />
        )}
      </div>

        </>
      )}

      {undo && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-pill bg-ink px-4 py-2.5 text-[14px] text-paper shadow-e3" role="status">
          <span>{undo.text}</span>
          <button type="button" className="font-medium underline underline-offset-2" onClick={() => void restore(undo.ids)}>
            Undo
          </button>
        </div>
      )}
      {sharing && notes.find((n) => n.id === sharing) && <ShareNoteDialog note={notes.find((n) => n.id === sharing)!} onClose={() => setSharing(null)} />}
      {selecting && (
        <div className="tdo-bulk" role="toolbar" aria-label="Selected notes">
          <b>{picked.size} selected</b>
          <button className="btn btn-secondary btn-sm" disabled={!picked.size} onClick={exportPicked}>
            <FA icon={faFileExport} /> Export
          </button>
          <button className="btn btn-secondary btn-sm" disabled={!picked.size} onClick={removePicked}>
            <FA icon={faTrash} /> Delete
          </button>
          <button className="ne-btn" aria-label="Stop selecting" onClick={stopSelecting}>
            <FA icon={faXmark} />
          </button>
        </div>
      )}

      <input
          ref={img}
          type="file"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) captureFile(f);
            e.target.value = "";
          }}
        />
    </div>
  );
}

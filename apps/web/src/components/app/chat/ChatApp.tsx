"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon as FA } from "@/components/ui/Icon";
import {
  faBars,
  faClone,
  faCopy,
  faDownload,
  faEllipsis,
  faEraser,
  faPaperclip,
  faPen,
  faShareNodes,
  faThumbtack,
  faTrash,
  faTriangleExclamation,
  faClock,
  faEnvelope,
  faListCheck,
  faPenToSquare,
  faTableCells,
} from "@fortawesome/free-solid-svg-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api/client";
import { qk } from "../../../lib/query/keys";
import { useRealtimeInvalidate } from "../../../hooks/useRealtimeInvalidate";
import type { Attachment, Chat, ChatFolder, Message } from "../../../lib/workspace";
import { chatGreeting, isUnread, prettyTitle } from "../../../lib/chat";
import { fmtTime, readPrefs } from "../../../lib/prefs";
import { writeText } from "../../../lib/drafts";
import ChatMessageActions from "./ChatMessageActions";
import { setCrumb } from "../../../lib/crumb";
import SidebarPortal from "../SidebarPortal";
import { safeName } from "../../../lib/notes";
import { BrandMark } from "../../BrandMark";
import Menu, { MenuItem, MenuSeparator } from "../../ui/Menu";
import { useConfirm, usePrompt } from "../../ui/Confirm";
import AttachmentImage from "../../ui/AttachmentImage";
import AudioWave from "../../ui/AudioWave";
import Markdown from "../Markdown";
import { useAiProviders } from "../../../features/ai/useAiProviders";
import { openSearch } from "../UniversalSearch";
import ChatSidebar, { type Tab } from "./ChatSidebar";
import Composer from "./Composer";
import {
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
  ChatSystemMessage,
  ChatTokenizedText,
  ChatToolCalls,
} from "./kit";
import ShareDialog from "./ShareDialog";
import { parseChatAction, parseChatActions } from "../../../lib/chat-actions";
import { isoDate } from "../../../lib/dates";
import { useCtxActions } from "../../../lib/context-actions";

// Stable empty values so a loading query doesn't create a new array each render.
const EMPTY_CHATS: Chat[] = [];
const EMPTY_FOLDERS: ChatFolder[] = [];
const EMPTY_MSGS: Message[] = [];
const CHAT_COLS = "id,title,updated_at,pinned,folder_id,last_read_at,share_token";
const MSG_COLS = "id,role,body,created_at,attachments";
const SIDE_KEY = "up_chat_sidebar";

/** "27 min ago" today, otherwise a short date ("Oct 12"). */
function ago(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  if (d.toDateString() === new Date().toDateString()) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const titleFrom = (text: string, files: File[]) => prettyTitle((text.split("\n")[0].trim() || files[0]?.name || "New chat").slice(0, 60));

export default function ChatApp({ name }: { name: string }) {
  const sb = useMemo(api, []);
  const router = useRouter();
  const params = useSearchParams();
  const { ask, dialog: confirmDialog } = useConfirm();
  const { prompt, dialog: promptDialog } = usePrompt();

  const activeId = params.get("c");
  const qc = useQueryClient();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  // The chats panel starts closed so the page opens like the reference (one centred column); the menu button shows it.
  const [side, setSide] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const uid = useRef("");
  const end = useRef<HTMLDivElement>(null);

  // Which AI answers: the server says what is configured, the person's choice is remembered in this browser.
  const { providers, provider, select: selectProvider } = useAiProviders();
  // The reply that is being written right now (shown as it arrives; the saved copy replaces it when finished).
  const [streaming, setStreaming] = useState<{ chatId: string; text: string } | null>(null);
  const hello = useMemo(() => chatGreeting(name), [name]);
  // "Or make something" chips put a starter sentence in the composer (not sent), so the person finishes it.
  const [prefill, setPrefill] = useState(0);
  const starters: [string, typeof faClock, string][] = [
    ["Write a note", faPenToSquare, "Write a note about "],
    ["Make a to-do list", faListCheck, "Make a to-do list for "],
    ["Build a table", faTableCells, "Build a table comparing "],
    ["Draft an email", faEnvelope, "Draft an email to "],
  ];
  /** Keeps a reply as a note in Notes (the first line becomes the title). */
  async function saveReplyAsNote(text: string): Promise<boolean> {
    const body = text.trim();
    if (!body) return false;
    const first = body.split("\n").find((l) => l.trim()) ?? "";
    const title = first.replace(/^[#>*\s-]+/, "").slice(0, 80);
    const { error } = await sb.from("notes").insert({ title, body, category: readPrefs().defaultCategory });
    if (error) {
      setErr("Couldn’t save that as a note.");
      return false;
    }
    return true;
  }

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(SIDE_KEY);
      if (v) setSide(JSON.parse(v));
    } catch {
      /* default */
    }
  }, []);
  const toggleSide = () => {
    if (window.matchMedia("(max-width: 900px)").matches) return setDrawer((d) => !d);
    setSide((s) => {
      try {
        window.localStorage.setItem(SIDE_KEY, JSON.stringify(!s));
      } catch {
        /* ignore */
      }
      return !s;
    });
  };

  /* ---------- data: three cached queries; local edits go through the cache, `load()` marks them stale ---------- */
  const chatsQ = useQuery({
    queryKey: qk.chats.list,
    queryFn: async () => {
      const { data, error } = await sb.from("chats").select(CHAT_COLS).order("updated_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data as Chat[];
    },
  });
  const foldersQ = useQuery({
    queryKey: qk.chats.folders,
    queryFn: async () => {
      const { data, error } = await sb.from("chat_folders").select("id,name").order("created_at");
      if (error) throw error;
      return data as ChatFolder[];
    },
  });
  const msgsQ = useQuery({
    queryKey: qk.chats.messages(activeId ?? "none"),
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await sb.from("chat_messages").select(MSG_COLS).eq("chat_id", activeId!).order("created_at");
      if (error) throw error;
      return data as Message[];
    },
  });
  const chats = chatsQ.data ?? EMPTY_CHATS;
  const folders = foldersQ.data ?? EMPTY_FOLDERS;
  const msgs = (activeId ? msgsQ.data : undefined) ?? EMPTY_MSGS;
  const ready = !chatsQ.isPending && !foldersQ.isPending;
  const active = chats.find((c) => c.id === activeId) ?? null;

  const setChats = useCallback((fn: (all: Chat[]) => Chat[]) => qc.setQueryData<Chat[]>(qk.chats.list, (old) => fn(old ?? [])), [qc]);
  const setFolders = useCallback(
    (fn: (all: ChatFolder[]) => ChatFolder[]) => qc.setQueryData<ChatFolder[]>(qk.chats.folders, (old) => fn(old ?? [])),
    [qc],
  );
  const setMsgs = useCallback(
    (fn: (all: Message[]) => Message[]) => {
      if (activeId) qc.setQueryData<Message[]>(qk.chats.messages(activeId), (old) => fn(old ?? []));
    },
    [qc, activeId],
  );
  const load = useCallback(() => qc.invalidateQueries({ queryKey: qk.chats.all }), [qc]);
  useRealtimeInvalidate("chats", [qk.chats.all]);
  useRealtimeInvalidate("chat_folders", [qk.chats.folders]);
  useRealtimeInvalidate("chat_messages", [qk.chats.all]);
  useEffect(() => {
    setErr(chatsQ.isError || foldersQ.isError ? "Couldn’t load your chats. Make sure the database migration has been applied." : "");
  }, [chatsQ.isError, foldersQ.isError]);

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => {
      uid.current = data.user?.id ?? "";
    });
  }, [sb]);

  // "?ask=…" (from the Health page) starts a new chat with that message, once, and the AI answers as usual.
  const asked = useRef(false);
  const askText = params.get("ask");
  useEffect(() => {
    if (!askText || activeId || asked.current || !ready) return;
    asked.current = true;
    void send(askText.slice(0, 500), [], () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send is recreated every render; this must run once per link
  }, [askText, activeId, ready]);

  // Old "?new=1" links just mean "an empty chat".
  useEffect(() => {
    if (params.get("new")) router.replace("/dashboard/chat");
  }, [params, router]);

  // Opening a chat marks it read.
  useEffect(() => {
    if (!activeId || !active || new Date(active.last_read_at) >= new Date(active.updated_at)) return;
    const now = new Date().toISOString();
    setChats((all) => all.map((c) => (c.id === activeId ? { ...c, last_read_at: now } : c)));
    sb.from("chats")
      .update({ last_read_at: now })
      .eq("id", activeId)
      .then(() => {});
  }, [activeId, active, sb]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, activeId, streaming?.text]);

  const paths = msgs.flatMap((m) => m.attachments.map((a) => a.path)).join("|");
  useEffect(() => {
    if (!paths) return setUrls({});
    let live = true;
    sb.storage
      .from("note-files")
      .createSignedUrls(paths.split("|"), 3600)
      .then(({ data }) => {
        if (live && data)
          setUrls(Object.fromEntries(data.filter((d) => d.path && d.signedUrl).map((d) => [d.path as string, d.signedUrl as string])));
      });
    return () => {
      live = false;
    };
  }, [sb, paths]);

  /* ---------- actions ---------- */
  const open = useCallback(
    (id: string) => {
      setDrawer(false);
      router.push(`/dashboard/chat?c=${id}`, { scroll: false });
    },
    [router],
  );
  const fresh = useCallback(() => {
    setDrawer(false);
    router.push("/dashboard/chat", { scroll: false });
  }, [router]);

  /** Asks the server for the assistant's reply and shows it as it streams in. The server saves the finished reply. */
  async function reply(id: string) {
    setStreaming({ chatId: id, text: "" });
    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chatId: id, provider, localDate: isoDate() }),
      });
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j.error ?? "The AI couldn’t reply. Your message was saved.");
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setStreaming({ chatId: id, text });
      }
    } catch {
      setErr("The AI couldn’t reply. Your message was saved.");
    } finally {
      setStreaming(null);
      await load();
    }
  }

  async function send(text: string, files: File[], saved: () => void): Promise<boolean> {
    setBusy(true);
    setErr("");
    try {
      let id = activeId;
      if (!id) {
        const { data, error } = await sb
          .from("chats")
          .insert({ title: titleFrom(text, files) })
          .select(CHAT_COLS)
          .single();
        if (error || !data) {
          setErr("Couldn’t start that chat.");
          return false;
        }
        id = data.id as string;
        setChats((all) => [data as Chat, ...all]);
      }
      const atts: Attachment[] = [];
      for (const f of files) {
        const path = `${uid.current}/chat/${id}/${crypto.randomUUID()}-${safeName(f.name)}`;
        const { error } = await sb.storage.from("note-files").upload(path, f, { contentType: f.type || "application/octet-stream" });
        if (error) setErr(`Couldn’t upload ${f.name}.`);
        else atts.push({ path, name: f.name, type: f.type || "application/octet-stream", size: f.size });
      }
      const { data: msg, error } = await sb
        .from("chat_messages")
        .insert({ chat_id: id, role: "user", body: text || (atts.length ? "Attachment" : ""), attachments: atts })
        .select(MSG_COLS)
        .single();
      if (error || !msg) {
        setErr("Couldn’t send that message.");
        return false;
      }
      saved(); // the message is stored: empty the input now, not after the AI has answered
      const now = new Date().toISOString();
      await sb.from("chats").update({ updated_at: now, last_read_at: now }).eq("id", id);
      if (!activeId) router.replace(`/dashboard/chat?c=${id}`, { scroll: false });
      else setMsgs((m) => [...m, msg as Message]);
      await load();
      if (provider !== "none") await reply(id);
      return true;
    } finally {
      setBusy(false);
    }
  }

  const patchChat = async (c: Chat, p: Partial<Chat>) => {
    setChats((all) => all.map((x) => (x.id === c.id ? { ...x, ...p } : x)));
    const { error } = await sb.from("chats").update(p).eq("id", c.id);
    if (error) {
      setErr("Couldn’t save that change.");
      load();
    }
  };

  const rename = async (c: Chat) => {
    const t = await prompt({
      title: "Rename chat",
      label: "Chat name",
      initial: c.title,
      confirmLabel: "Save",
      validate: (v) => (v.length > 200 ? "Keep it under 200 characters." : null),
    });
    if (t) patchChat(c, { title: t });
  };

  const removeChat = async (c: Chat) => {
    const yes = await ask({
      title: "Delete this chat?",
      body: <>“{c.title}” and all its messages will be permanently deleted.</>,
      confirmLabel: "Delete chat",
      danger: true,
    });
    if (!yes) return;
    const { data } = await sb.from("chat_messages").select("attachments").eq("chat_id", c.id);
    const files = (data ?? []).flatMap((m) => ((m.attachments as Attachment[]) ?? []).map((a) => a.path));
    if (files.length) await sb.storage.from("note-files").remove(files);
    const { error } = await sb.from("chats").delete().eq("id", c.id);
    if (error) return setErr("Couldn’t delete that chat.");
    setChats((all) => all.filter((x) => x.id !== c.id));
    if (c.id === activeId) fresh();
  };

  const addFolder = async () => {
    const n = await prompt({
      title: "New folder",
      label: "Folder name",
      placeholder: "e.g. Work",
      confirmLabel: "Create folder",
      validate: (v) => (v.length > 60 ? "Keep it under 60 characters." : null),
    });
    if (!n) return;
    const { data, error } = await sb.from("chat_folders").insert({ name: n }).select("id,name").single();
    if (error || !data) return setErr("Couldn’t create that folder.");
    setFolders((f) => [...f, data as ChatFolder]);
  };
  const renameFolder = async (f: ChatFolder) => {
    const n = await prompt({ title: "Rename folder", label: "Folder name", initial: f.name, confirmLabel: "Save" });
    if (!n) return;
    setFolders((all) => all.map((x) => (x.id === f.id ? { ...x, name: n } : x)));
    const { error } = await sb.from("chat_folders").update({ name: n }).eq("id", f.id);
    if (error) {
      setErr("Couldn’t rename that folder.");
      load();
    }
  };
  const deleteFolder = async (f: ChatFolder) => {
    const yes = await ask({
      title: "Delete this folder?",
      body: <>“{f.name}” will be deleted. The chats inside aren’t lost — they move back to your list.</>,
      confirmLabel: "Delete folder",
      danger: true,
    });
    if (!yes) return;
    const { error } = await sb.from("chat_folders").delete().eq("id", f.id);
    if (error) return setErr("Couldn’t delete that folder.");
    setFolders((all) => all.filter((x) => x.id !== f.id));
    setChats((all) => all.map((c) => (c.folder_id === f.id ? { ...c, folder_id: null } : c)));
  };

  const toMarkdown = (title: string, list: Message[]) =>
    `# ${title}\n\n` +
    list
      .map((m) => `**${m.role === "user" ? "You" : "Assistant"}** · ${new Date(m.created_at).toLocaleString()}\n\n${m.body}\n`)
      .join("\n");
  const messagesOf = async (c: Chat) =>
    c.id === activeId
      ? msgs
      : (((await sb.from("chat_messages").select(MSG_COLS).eq("chat_id", c.id).order("created_at")).data as Message[]) ?? []);
  const flash = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const copyMarkdown = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(toMarkdown(active.title, msgs));
      flash();
    } catch {
      setErr("Couldn’t copy to the clipboard.");
    }
  };
  const sharingChat = chats.find((c) => c.id === sharing) ?? null;
  const exportChat = async (c: Chat) => {
    const list = await messagesOf(c);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([toMarkdown(c.title, list)], { type: "text/markdown" }));
    a.download = `${c.title.replace(/[^\w\- ]+/g, "").trim() || "chat"}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const setRead = (c: Chat, read: boolean) =>
    patchChat(c, { last_read_at: read ? new Date().toISOString() : new Date(new Date(c.updated_at).getTime() - 5000).toISOString() });

  // Right-click actions on a chat in the list (see lib/context-actions).
  useCtxActions("chat", (id, action) => {
    const c = chats.find((x) => x.id === id);
    if (!c) return;
    if (action === "open") open(id);
    else if (action === "pin") void patchChat(c, { pinned: !c.pinned });
    else if (action === "rename") void rename(c);
    else if (action === "read") void setRead(c, isUnread(c) && c.id !== activeId);
    else if (action === "delete") void removeChat(c);
  });

  const duplicate = async (c: Chat) => {
    const { data: copy, error } = await sb
      .from("chats")
      .insert({ title: `${c.title} (copy)`.slice(0, 200), folder_id: c.folder_id })
      .select(CHAT_COLS)
      .single();
    if (error || !copy) return setErr("Couldn’t duplicate that chat.");
    const list = await messagesOf(c);
    if (list.length) {
      const { error: e2 } = await sb
        .from("chat_messages")
        .insert(list.map((m) => ({ chat_id: copy.id, role: m.role, body: m.body, created_at: m.created_at })));
      if (e2) setErr("The chat was copied, but some messages couldn’t be.");
    }
    await load();
    open(copy.id as string);
  };

  const clearChat = async (c: Chat) => {
    const yes = await ask({
      title: "Clear this chat?",
      body: <>All messages in “{c.title}” will be deleted. The chat itself stays.</>,
      confirmLabel: "Clear messages",
      danger: true,
    });
    if (!yes) return;
    const { data } = await sb.from("chat_messages").select("attachments").eq("chat_id", c.id);
    const files = (data ?? []).flatMap((m) => ((m.attachments as Attachment[]) ?? []).map((a) => a.path));
    if (files.length) await sb.storage.from("note-files").remove(files);
    const { error } = await sb.from("chat_messages").delete().eq("chat_id", c.id);
    if (error) return setErr("Couldn’t clear that chat.");
    if (c.id === activeId) setMsgs(() => []);
  };

  /* ---------- render ---------- */
  return (
    <div className="cx" data-side={side} data-drawer={drawer}>
      {confirmDialog}
      {promptDialog}
      {drawer && <div className="tdo-scrim" onClick={() => setDrawer(false)} />}
      {sharingChat && (
        <ShareDialog
          chat={sharingChat}
          sb={sb}
          onClose={() => setSharing(null)}
          onChange={(token) => setChats((all) => all.map((c) => (c.id === sharingChat.id ? { ...c, share_token: token } : c)))}
        />
      )}
      {copied && (
        <div className="cx-toast" role="status">
          Copied to clipboard
        </div>
      )}
      <SidebarPortal>
        <ChatSidebar
          chats={chats}
          folders={folders}
          activeId={activeId}
          tab={tab}
          ready={ready}
          onTab={setTab}
          onOpen={open}
          onNew={fresh}
          onSearch={openSearch}
          onAddFolder={addFolder}
          onRenameFolder={renameFolder}
          onDeleteFolder={deleteFolder}
          onPin={(c) => patchChat(c, { pinned: !c.pinned })}
          onRename={rename}
          onMove={(c, folder_id) => patchChat(c, { folder_id })}
          onDelete={removeChat}
          onRead={setRead}
          onDuplicate={duplicate}
          onShare={(c) => setSharing(c.id)}
          onExport={exportChat}
          onClear={clearChat}
        />
      </SidebarPortal>

      <section className="cx-main">
        <CrumbSync label={active ? prettyTitle(active.title) : "New chat"} />
        <header className="cx-head">
          {active ? (
            // The title lives in the breadcrumb at the top of the page; it stays here for screen readers and keeps Rename reachable.
            <div className="cx-titlewrap" data-quiet>
              <button
                className="cx-title"
                onClick={() => rename(active)}
                title="Rename chat"
                aria-label={`${prettyTitle(active.title)}. Click to rename`}
              >
                <h1>{prettyTitle(active.title)}</h1>
                <FA icon={faPen} />
              </button>
              <small>
                {msgs.length === 0 ? "No messages yet" : `${msgs.length} ${msgs.length === 1 ? "message" : "messages"}`}
                {msgs[0] &&
                  ` · Started ${new Date(msgs[0].created_at).toDateString() === new Date().toDateString() ? `today at ${fmtTime(msgs[0].created_at)}` : new Date(msgs[0].created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`}
              </small>
            </div>
          ) : (
            <div className="cx-titlewrap" />
          )}
          {active && (
            <div className="cx-actions">
              <button
                className="ne-btn"
                aria-label={active.pinned ? "Unpin chat" : "Pin chat"}
                data-on={active.pinned}
                onClick={() => patchChat(active, { pinned: !active.pinned })}
              >
                <FA icon={faThumbtack} />
              </button>
              <button
                className="ne-btn"
                aria-label="Share chat"
                title={active.share_token ? "Shared — manage link" : "Share chat"}
                data-on={!!active.share_token}
                onClick={() => setSharing(active.id)}
              >
                <FA icon={faShareNodes} />
              </button>
              <Menu label="More options" trigger={<FA icon={faEllipsis} />} className="cx-more">
                <MenuItem onSelect={() => rename(active)}>
                  <span>
                    <FA icon={faPen} /> Rename
                  </span>
                </MenuItem>
                <MenuItem onSelect={() => duplicate(active)}>
                  <span>
                    <FA icon={faClone} /> Duplicate
                  </span>
                </MenuItem>
                <MenuItem onSelect={() => setSharing(active.id)}>
                  <span>
                    <FA icon={faShareNodes} /> {active.share_token ? "Manage shared link" : "Share"}
                  </span>
                </MenuItem>
                <MenuItem onSelect={copyMarkdown}>
                  <span>
                    <FA icon={faCopy} /> Copy as Markdown
                  </span>
                </MenuItem>
                <MenuItem onSelect={() => exportChat(active)}>
                  <span>
                    <FA icon={faDownload} /> Export as Markdown
                  </span>
                </MenuItem>
                <MenuSeparator />
                <MenuItem danger onSelect={() => clearChat(active)}>
                  <span>
                    <FA icon={faEraser} /> Clear messages
                  </span>
                </MenuItem>
                <MenuItem danger onSelect={() => removeChat(active)}>
                  <span>
                    <FA icon={faTrash} /> Delete chat
                  </span>
                </MenuItem>
              </Menu>
            </div>
          )}
        </header>

        {err && (
          <p className="form-err cx-err" role="alert">
            {err}
          </p>
        )}

        <ChatLayout
          footer={
            activeId ? (
            <>
              {activeId && provider === "none" && (
                <ChatSystemMessage icon={<FA icon={faTriangleExclamation} />}>
                  No AI is selected, so replies aren’t generated. Your messages are saved to this chat.
                </ChatSystemMessage>
              )}
              <Composer
                key={activeId ?? "new"}
                draftKey={`chat:${activeId ?? "new"}`}
                busy={busy}
                providers={providers}
                provider={provider}
                onProvider={selectProvider}
                onSend={send}
                onError={setErr}
                autoFocus
              />
            </>
            ) : null
          }
        >
          {!activeId ? (
            <div className="cx-hello">
              <span className="cx-mark" aria-hidden>
                <BrandMark size={40} />
              </span>
              <h2>{hello.title}</h2>
              <p>{hello.sub}</p>
              <div className="cx-hello-compose">
                <Composer
                  key={`new-${prefill}`}
                  draftKey="chat:new"
                  starter={prefill > 0}
                  busy={busy}
                  providers={providers}
                  provider={provider}
                  onProvider={selectProvider}
                  onSend={send}
                  onError={setErr}
                  autoFocus
                />
              </div>
              {chats.length > 0 && (
                <section className="cx-recent" aria-labelledby="cx-recent-h">
                  <h3 id="cx-recent-h">Pick up where you left off</h3>
                  <ul>
                    {chats.slice(0, 3).map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => open(c.id)}>
                          <FA icon={faClock} />
                          <span>{prettyTitle(c.title)}</span>
                          <time dateTime={c.updated_at}>{ago(c.updated_at)}</time>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="cx-make" aria-labelledby="cx-make-h">
                <h3 id="cx-make-h">Or make something</h3>
                <div>
                  {starters.map(([label, icon, prompt]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        writeText("chat:new", prompt);
                        setPrefill((n) => n + 1);
                      }}
                    >
                      <FA icon={icon} /> {label}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <ChatMessageList endRef={end}>
              {msgs.length === 0 && ready && <p className="ap-none">Say something to start this chat.</p>}
              {msgs.map((m) => {
                const parsed = m.role === "assistant" ? parseChatActions(m.body) : null;
                return (
                  <ChatMessage key={m.id} role={m.role}>
                    <ChatMessageBubble>
                      {parsed ? (
                        <>
                          {parsed.body && <Markdown text={parsed.body} />}
                          <ChatToolCalls shows={parsed.shows} proposals={parsed.proposals} messageId={m.id} chatId={activeId} />
                        </>
                      ) : (
                        m.body && <ChatTokenizedText text={m.body} />
                      )}
                      {m.attachments.map((a) => {
                        const u = urls[a.path];
                        return (
                          <div key={a.path} className="cx-att">
                            {u && a.type.startsWith("image/") && <AttachmentImage src={u} name={a.name} />}
                            {u && a.type.startsWith("audio/") && <AudioWave src={u} label={a.name} />}
                            {!a.type.startsWith("image/") &&
                              !a.type.startsWith("audio/") &&
                              (u ? (
                                <a href={u} target="_blank" rel="noopener noreferrer">
                                  <FA icon={faPaperclip} /> {a.name}
                                </a>
                              ) : (
                                <span>{a.name}</span>
                              ))}
                          </div>
                        );
                      })}
                      <div className="cx-msgfoot">
                        {m.role === "assistant" && (parsed?.body || m.body) && (
                          <ChatMessageActions text={parsed?.body || m.body} onSaveNote={saveReplyAsNote} />
                        )}
                        <ChatMessageMetadata at={m.created_at} />
                      </div>
                    </ChatMessageBubble>
                  </ChatMessage>
                );
              })}
              {streaming && streaming.chatId === activeId && (
                <ChatMessage role="assistant" busy>
                  <ChatMessageBubble>
                    {streaming.text ? <Markdown text={parseChatAction(streaming.text).body} /> : <p className="ap-none">Thinking…</p>}
                  </ChatMessageBubble>
                </ChatMessage>
              )}
            </ChatMessageList>
          )}
        </ChatLayout>
      </section>
    </div>
  );
}

/** Puts the open chat's name in the breadcrumb ("Chat / Exception handling in C#"). */
function CrumbSync({ label }: { label: string }) {
  useEffect(() => {
    setCrumb(label);
    return () => setCrumb(undefined);
  }, [label]);
  return null;
}

/** What "Jump back in" lists: recent notes, chats and today's journal entries, newest first. Pure, so it is unit-tested. */
export type RecentKind = "note" | "chat" | "journal";
export type RecentItem = { kind: RecentKind; id: string; title: string; at: string; href: string };

type Note = { id: string; title: string | null; updated_at: string };
type Chat = { id: string; title: string | null; updated_at: string };
type Entry = { id: string; body: string | null; created_at: string };

/** The first line of a journal entry, as a title (an entry with only a voice note or a file has no text). */
const firstLine = (body: string | null) => (body ?? "").split("\n").map((l) => l.trim()).find(Boolean) ?? "";

export function recentItems(notes: Note[], chats: Chat[], entries: Entry[], filter: RecentKind | "all" = "all", limit = 6): RecentItem[] {
  const all: RecentItem[] = [
    ...notes.map((n) => ({ kind: "note" as const, id: n.id, title: n.title?.trim() || "Untitled", at: n.updated_at, href: `/dashboard/notes?note=${encodeURIComponent(n.id)}` })),
    ...chats.map((c) => ({ kind: "chat" as const, id: c.id, title: c.title?.trim() || "New chat", at: c.updated_at, href: `/dashboard/chat?c=${encodeURIComponent(c.id)}` })),
    ...entries.map((e) => ({ kind: "journal" as const, id: e.id, title: firstLine(e.body) || "Voice or attachment", at: e.created_at, href: "/dashboard/journal" })),
  ];
  return all
    .filter((x) => filter === "all" || x.kind === filter)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, limit);
}
